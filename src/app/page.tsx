"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatMessage } from "@/components/ChatMessage";
import { TablePreview } from "@/components/TablePreview";
import {
  askState,
  fetchChatHistory,
  fetchChatSessions,
  downloadChatPdf,
  downloadProvenance,
  downloadTables,
  executeCode,
  fetchCombinedState,
  streamChat,
} from "@/lib/api";
import type {
  ChatSession,
  ChatMessage as ChatMessageType,
  SidebarState,
  TableRow,
} from "@/lib/types";

const USER_ID = "demo";
const MODEL = "assistant";

const CHAT_LIST_PREF_KEY = "pneuma:pref:chatListOpen";

type ChatRuntime = {
  messages: ChatMessageType[];
  isStreaming: boolean;
  status: string;
  sidebar: SidebarState | null;
  sidebarStatus: string;
  tableIndex: number;
  provIndex: number;
  executionResult: TableRow[];
  queryInput: string;
  queryResult: TableRow[];
};

const cloneMessages = (messages: ChatMessageType[]): ChatMessageType[] =>
  messages.map((message) => ({ ...message }));

const createChatRuntime = (
  messages: ChatMessageType[] = []
): ChatRuntime => ({
  messages: cloneMessages(messages),
  isStreaming: false,
  status: "Ready",
  sidebar: null,
  sidebarStatus: "Idle",
  tableIndex: 0,
  provIndex: 0,
  executionResult: [],
  queryInput: "",
  queryResult: [],
});

export default function Home() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatStateById, setChatStateById] = useState<Record<string, ChatRuntime>>(
    () => ({})
  );
  const [activeChatId, setActiveChatId] = useState("");
  const [isChatListOpen, setIsChatListOpen] = useState(true);
  const [hasLoadedChats, setHasLoadedChats] = useState(false);

  const activeChat = activeChatId
    ? chatStateById[activeChatId] ?? createChatRuntime()
    : createChatRuntime();

  const activeChatMeta = chatSessions.find((chat) => chat.id === activeChatId);

  const updateChatState = (
    chatId: string,
    updater: (current: ChatRuntime) => ChatRuntime
  ) => {
    setChatStateById((prev) => {
      const current = prev[chatId] ?? createChatRuntime();
      const updated = updater(current);
      if (updated === current) return prev;
      return { ...prev, [chatId]: updated };
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(CHAT_LIST_PREF_KEY);
    if (stored === null) return;
    setIsChatListOpen(stored === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHAT_LIST_PREF_KEY, String(isChatListOpen));
  }, [isChatListOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadChats = async () => {
      const sessions = await fetchChatSessions(USER_ID);
      if (!isMounted) return;
      setChatSessions(sessions);

      const histories = await Promise.all(
        sessions.map((session) => fetchChatHistory(USER_ID, session.id))
      );
      if (!isMounted) return;

      setChatStateById(() => {
        const next: Record<string, ChatRuntime> = {};
        sessions.forEach((session, index) => {
          next[session.id] = createChatRuntime(histories[index] ?? []);
        });
        return next;
      });

      setActiveChatId((prev) => prev || sessions[0]?.id || "");
      setHasLoadedChats(true);
    };

    loadChats();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedChats || !activeChatId) return;
    refreshSidebar(activeChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, hasLoadedChats]);

  const {
    messages,
    isStreaming,
    status,
    sidebar,
    sidebarStatus,
    tableIndex,
    provIndex,
    executionResult,
    queryInput,
    queryResult,
  } = activeChat;

  const retrievedTables = sidebar?.retrieved_tables ?? {};
  const retrievedTableNames = useMemo(
    () => Object.keys(retrievedTables),
    [retrievedTables]
  );
  const provSteps = sidebar?.prov_steps ?? [];

  useEffect(() => {
    if (!activeChatId) return;
    updateChatState(activeChatId, (prev) =>
      prev.tableIndex === 0 ? prev : { ...prev, tableIndex: 0 }
    );
  }, [activeChatId, retrievedTableNames.length]);

  useEffect(() => {
    if (!activeChatId) return;
    updateChatState(activeChatId, (prev) =>
      prev.provIndex === 0 ? prev : { ...prev, provIndex: 0 }
    );
  }, [activeChatId, provSteps.length]);

  async function refreshSidebar(chatId: string) {
    if (!chatId) return;
    updateChatState(chatId, (prev) => ({ ...prev, sidebarStatus: "Refreshing..." }));
    try {
      const fresh = await fetchCombinedState(USER_ID, chatId);
      updateChatState(chatId, (prev) => ({
        ...prev,
        sidebar: fresh,
        sidebarStatus: "Live",
      }));
    } catch (error) {
      updateChatState(chatId, (prev) => ({
        ...prev,
        sidebarStatus: "Offline",
      }));
    }
  }

  const handleSend = async (content: string) => {
    const chatId = activeChatId;
    if (!chatId) return;
    const currentMessages =
      chatStateById[chatId]?.messages ?? [];
    const nextMessages: ChatMessageType[] = [
      ...currentMessages,
      { role: "user", content },
      { role: "assistant", content: "" },
    ];
    const assistantIndex = nextMessages.length - 1;

    updateChatState(chatId, (prev) => ({
      ...prev,
      messages: nextMessages,
      isStreaming: true,
      status: "Streaming response...",
    }));

    let assistantText = "";
    try {
      await streamChat(USER_ID, chatId, nextMessages.slice(0, -1), [], (event) => {
        if (event.sender === "assistant") {
          assistantText += event.text;
          updateChatState(chatId, (prev) => {
            const updated = [...prev.messages];
            const current = updated[assistantIndex] ?? {
              role: "assistant",
              content: "",
            };
            updated[assistantIndex] = { ...current, content: assistantText };
            return { ...prev, messages: updated };
          });
        }
        if (event.sender === "log") {
          updateChatState(chatId, (prev) => ({
            ...prev,
            status: event.text.replace(/^LOG\s*/i, ""),
          }));
        }
        if (event.sender === "done") {
          updateChatState(chatId, (prev) => ({ ...prev, status: event.text }));
        }
      });
    } catch (error) {
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Stream failed.",
      }));
    } finally {
      updateChatState(chatId, (prev) => ({ ...prev, isStreaming: false }));
      refreshSidebar(chatId);
    }
  };

  const handleExecute = async () => {
    const chatId = activeChatId;
    if (!chatId) return;
    updateChatState(chatId, (prev) => ({ ...prev, status: "Executing script..." }));
    try {
      const rows = await executeCode(USER_ID, chatId);
      updateChatState(chatId, (prev) => ({
        ...prev,
        executionResult: rows,
        status: "Execution finished.",
      }));
    } catch (error) {
      updateChatState(chatId, (prev) => ({ ...prev, status: "Execution failed." }));
    }
  };

  const handleStateQuery = async () => {
    const chatId = activeChatId;
    if (!chatId) return;
    const trimmed = (chatStateById[chatId]?.queryInput ?? "").trim();
    if (!trimmed) return;
    updateChatState(chatId, (prev) => ({ ...prev, status: "Querying state..." }));
    try {
      const response = await askState(USER_ID, chatId, trimmed);
      updateChatState(chatId, (prev) => ({
        ...prev,
        queryResult: response.result ?? [],
        status: "Query complete.",
      }));
    } catch (error) {
      updateChatState(chatId, (prev) => ({ ...prev, status: "Query failed." }));
    }
  };

  const currentRetrievedTable =
    retrievedTableNames.length > 0
      ? retrievedTables[retrievedTableNames[tableIndex]]
      : [];
  const currentProvStep = provSteps[provIndex] ?? "";

  const handlePdfExport = async () => {
    const chatId = activeChatId;
    if (!chatId) return;
    updateChatState(chatId, (prev) => ({ ...prev, status: "Exporting PDF..." }));
    try {
      await downloadChatPdf(chatId, MODEL, messages);
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "PDF downloaded.",
      }));
    } catch (error) {
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "PDF export failed.",
      }));
    }
  };

  const handleTableDownload = async () => {
    const chatId = activeChatId;
    if (!chatId) return;
    updateChatState(chatId, (prev) => ({
      ...prev,
      status: "Preparing table export...",
    }));
    try {
      await downloadTables(USER_ID, chatId);
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Tables downloaded.",
      }));
    } catch (error) {
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Table export failed.",
      }));
    }
  };

  const handleProvenanceDownload = async () => {
    const chatId = activeChatId;
    if (!chatId) return;
    updateChatState(chatId, (prev) => ({
      ...prev,
      status: "Preparing provenance script...",
    }));
    try {
      await downloadProvenance(USER_ID, chatId);
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Provenance downloaded.",
      }));
    } catch (error) {
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Provenance export failed.",
      }));
    }
  };

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden px-6 py-6 lg:px-10">
      <div className="app-shell flex flex-1 min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/70 p-6 lg:p-8 fade-in">
        <div
          className={`flex min-h-0 flex-1 ${isChatListOpen ? "gap-6" : "gap-0"}`}
        >
          <aside
            className={`relative min-w-0 overflow-hidden transition-all duration-300 ${
              isChatListOpen ? "w-72 opacity-100" : "w-0 opacity-0"
            }`}
            aria-hidden={!isChatListOpen}
          >
            <div
              className={`panel flex h-full flex-col rounded-[28px] p-5 ${
                isChatListOpen ? "" : "pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg">Chats</h2>
                <span className="text-xs text-slate/70">{chatSessions.length}</span>
              </div>
              <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
                {chatSessions.length === 0 ? (
                  <p className="text-xs text-slate/70">No chats yet.</p>
                ) : (
                  chatSessions.map((chat) => {
                    const isActive = chat.id === activeChatId;
                    return (
                      <button
                        key={chat.id}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-ember/40 bg-ember/10"
                            : "border-sand-strong/70 bg-white hover:border-ember/30"
                        }`}
                        onClick={() => setActiveChatId(chat.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-ink">
                            {chat.title}
                          </span>
                          <span className="text-[0.62rem] uppercase tracking-[0.2em] text-slate/60">
                            {chat.lastActive}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-snug text-slate/70">
                          {chat.summary}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-4 rounded-2xl border border-sand-strong/70 bg-white px-3 py-2 text-xs text-slate/70">
                Switch chats to view each conversation and sidebar state.
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full border border-sand-strong/70 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate"
                  onClick={() => setIsChatListOpen((prev) => !prev)}
                  aria-pressed={isChatListOpen}
                >
                  {isChatListOpen ? "Hide chats" : "Show chats"}
                </button>
                <div>
                  <h1 className="font-display text-3xl text-ink sm:text-4xl">
                    Pneuma-Seeker
                  </h1>
                  <p className="text-s text-slate/70">
                    Active chat: {activeChatMeta?.title ?? (activeChatId || "Loading...")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-sea/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sea">
                  {sidebarStatus}
                </span>
                <div className="rounded-full border border-sand-strong/70 bg-white px-4 py-2 text-xs text-slate">
                  Demo user
                </div>
                <Link
                  className="rounded-full border border-sand-strong/70 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate"
                  href="/login"
                >
                  Login
                </Link>
                <Link
                  className="rounded-full bg-ember px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white"
                  href="/signup"
                >
                  Sign up
                </Link>
              </div>
            </header>

            <div className="mt-8 grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <main className="flex h-full min-h-0 flex-col gap-6">
            <section className="panel flex min-h-0 flex-1 flex-col rounded-[28px] p-6">
              <div className="mt-6 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-2">
                {messages.map((message, index) => (
                  <ChatMessage key={`${message.role}-${index}`} message={message} />
                ))}
              </div>
            </section>

            <ChatComposer isSending={isStreaming} onSend={handleSend} />
          </main>

          <aside className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pr-2">
            <section className="panel rounded-[28px] p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl">Retrieved tables</h3>
                <div className="text-xs text-slate/70">
                  {retrievedTableNames.length > 0
                    ? `${tableIndex + 1}/${retrievedTableNames.length}`
                    : "0/0"}
                </div>
              </div>
              {retrievedTableNames.length === 0 ? (
                <p className="mt-4 text-sm text-slate/70">
                  No tables retrieved yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <TablePreview
                    title={retrievedTableNames[tableIndex]}
                    rows={currentRetrievedTable}
                  />
                  <div className="flex items-center justify-between">
                    <button
                      className="rounded-full border border-sand-strong/70 bg-white px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                      onClick={() =>
                        updateChatState(activeChatId, (prev) => ({
                          ...prev,
                          tableIndex: Math.max(prev.tableIndex - 1, 0),
                        }))
                      }
                      disabled={tableIndex === 0}
                    >
                      Prev
                    </button>
                    <button
                      className="rounded-full border border-sand-strong/70 bg-white px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                      onClick={() =>
                        updateChatState(activeChatId, (prev) => ({
                          ...prev,
                          tableIndex: Math.min(
                            prev.tableIndex + 1,
                            retrievedTableNames.length - 1
                          ),
                        }))
                      }
                      disabled={tableIndex >= retrievedTableNames.length - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="panel rounded-[28px] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-xl">State (T, S)</h3>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-full bg-sea/10 px-3 py-1 text-sea">
                    T: {sidebar?.state?.is_T_materialized ? "Yes" : "No"}
                  </span>
                  <span className="rounded-full bg-ember/10 px-3 py-1 text-ember">
                    S: {sidebar?.state?.is_S_executed ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                {sidebar?.state?.T ? (
                  Object.entries(sidebar.state.T).map(([name, rows]) => (
                    <TablePreview
                      key={name}
                      title={name}
                      rows={rows}
                      columnDescriptions={
                        sidebar.state.column_descriptions?.[name] ?? {}
                      }
                    />
                  ))
                ) : (
                  <p className="text-sm text-slate/70">No target tables yet.</p>
                )}
              </div>
              <div className="mt-5 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/70">
                    Python script (S)
                  </p>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-xs text-ink">
                    {sidebar?.state?.S?.trim() || "No script yet."}
                  </pre>
                </div>
                <button
                  className="rounded-2xl bg-sea px-4 py-3 text-sm font-semibold text-white"
                  onClick={handleExecute}
                  disabled={!sidebar?.state?.S}
                >
                  Execute script
                </button>
                {executionResult.length > 0 ? (
                  <TablePreview title="Execution result" rows={executionResult} />
                ) : null}
              </div>
            </section>

            <section className="panel rounded-[28px] p-6">
              <h3 className="font-display text-xl">Ask current state</h3>
              <p className="mt-1 text-sm text-slate/70">
                Query T or retrieved tables. Pneuma will respond with a query result.
              </p>
              <div className="mt-4 space-y-3">
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
                  placeholder="Ask: what is the average sentiment per cohort?"
                  value={queryInput}
                  onChange={(event) =>
                    updateChatState(activeChatId, (prev) => ({
                      ...prev,
                      queryInput: event.target.value,
                    }))
                  }
                />
                <button
                  className="rounded-2xl bg-ember px-4 py-3 text-sm font-semibold text-white"
                  onClick={handleStateQuery}
                >
                  Ask
                </button>
                {queryResult.length > 0 ? (
                  <TablePreview title="Query result" rows={queryResult} />
                ) : null}
              </div>
            </section>

            <section className="panel rounded-[28px] p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl">Provenance of T</h3>
                <span className="text-xs text-slate/70">
                  {provSteps.length > 0 ? `${provIndex + 1}/${provSteps.length}` : "0/0"}
                </span>
              </div>
              <div className="mt-4 rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm text-ink">
                {provSteps.length === 0 ? (
                  <p className="text-slate/70">No provenance steps yet.</p>
                ) : (
                  <div
                    className="text-sm leading-relaxed text-ink [&_pre]:mt-3 [&_pre]:rounded-2xl [&_pre]:bg-sand/80 [&_pre]:p-3 [&_code]:text-[0.82rem]"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(currentProvStep),
                    }}
                  />
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  className="rounded-full border border-sand-strong/70 bg-white px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                  onClick={() =>
                    updateChatState(activeChatId, (prev) => ({
                      ...prev,
                      provIndex: Math.max(prev.provIndex - 1, 0),
                    }))
                  }
                  disabled={provIndex === 0}
                >
                  Prev
                </button>
                <button
                  className="rounded-full border border-sand-strong/70 bg-white px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                  onClick={() =>
                    updateChatState(activeChatId, (prev) => ({
                      ...prev,
                      provIndex: Math.min(prev.provIndex + 1, provSteps.length - 1),
                    }))
                  }
                  disabled={provIndex >= provSteps.length - 1}
                >
                  Next
                </button>
              </div>
            </section>

            <section className="panel rounded-[28px] p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl">Export tools</h3>
                <span className="text-xs text-slate/70">
                  {activeChatId || "No chat"}
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  className="rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ember/50"
                  onClick={handleTableDownload}
                  disabled={!sidebar?.state?.is_T_materialized}
                >
                  Download target tables (T)
                </button>
                <button
                  className="rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ember/50"
                  onClick={handleProvenanceDownload}
                  disabled={!sidebar?.state?.is_T_materialized}
                >
                  Download provenance script
                </button>
                <button
                  className="rounded-2xl bg-ember px-4 py-3 text-sm font-semibold text-white"
                  onClick={handlePdfExport}
                >
                  Export chat transcript
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
