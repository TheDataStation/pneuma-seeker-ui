// src/components/ChatApp.tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatSidebar } from "@/components/ChatSidebar";
import { MainChatArea } from "@/components/MainChatArea";
import {
  InspectorSidebar,
  hasSidebarContent,
} from "@/components/InspectorSidebar";

import {
  ApiError,
  getCurrentUser,
  getChatHistory,
  getAllChats,
  downloadE2EScript,
  downloadTargetViews,
  executeCode,
  getChatState,
  logout,
  streamChat,
  deleteChat,
  getAccessibleDatasets,
} from "@/lib/api";

import type {
  User,
  ChatSession,
  ChatMessage as ChatMessageType,
  ChatRuntime,
} from "@/lib/types";
import { clearStoredToken, generateUUID, saveBlob } from "@/lib/utils";
import AppHeader from "./AppHeader";
import { CONFIG } from "@/lib/config";

const cloneMessages = (messages: ChatMessageType[]): ChatMessageType[] =>
  messages.map((message) => ({ ...message }));

const createChatRuntime = (messages: ChatMessageType[] = []): ChatRuntime => ({
  messages: cloneMessages(messages),
  isStreaming: false,
  status: "Ready",
  dataset: null,
  sidebar: null,
  sidebarStatus: "Idle",
  tableIndex: 0,
  provIndex: 0,
  executionResult: [],
  queryInput: "",
  queryResult: [],
  isHistoryLoading: false,
});

export function ChatApp({ initialChatId }: { initialChatId?: string }) {
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatStateById, setChatStateById] = useState<
    Record<string, ChatRuntime>
  >({});
  const [activeChatId, setActiveChatId] = useState(initialChatId ?? "");
  const [hasLoadedChats, setHasLoadedChats] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const loadedHistoryIds = useRef<Set<string>>(new Set());
  const [isChatListOpen, setIsChatListOpen] = useState(() => {
    if (typeof window == "undefined") {
      return true;
    }

    const saved = localStorage.getItem("isChatListOpen");
    if (saved == null) {
      return true;
    }

    return JSON.parse(saved);
  });

  useEffect(() => {
    localStorage.setItem("isChatListOpen", JSON.stringify(isChatListOpen));
  }, [isChatListOpen]);

  const [accessibleDatasets, setAccessibleDatasets] = useState<string[]>([]);
  const [manualDataset, setManualDataset] = useState<string>("");

  const emptyRuntime = useMemo(() => createChatRuntime(), []);
  const activeChat = activeChatId
    ? (chatStateById[activeChatId] ?? emptyRuntime)
    : emptyRuntime;

  const selectedDataset = activeChatId
    ? (activeChat.dataset ?? manualDataset)
    : manualDataset;

  const updateChatState = useCallback(
    (chatId: string, updater: (current: ChatRuntime) => ChatRuntime) => {
      setChatStateById((prev) => {
        const current = prev[chatId] ?? createChatRuntime();
        const updated = updater(current);
        if (updated === current) return prev;
        return { ...prev, [chatId]: updated };
      });
    },
    [],
  );

  const redirectToLogin = useCallback(() => {
    clearStoredToken();
    router.replace(`/login?next=${encodeURIComponent("/")}`);
  }, [router]);

  const handleUnauthorized = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        redirectToLogin();
        return true;
      }
      return false;
    },
    [redirectToLogin],
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (typeof window !== "undefined" && !localStorage.getItem("token")) {
        redirectToLogin();
        return;
      }

      try {
        const [currentUser, datasetsRes] = await Promise.all([
          getCurrentUser(),
          getAccessibleDatasets(),
        ]);
        if (!mounted) return;
        setUser(currentUser);
        setAuthChecked(true);
        setAccessibleDatasets(datasetsRes.datasets);

        if (datasetsRes.datasets.length > 1) {
          const saved = localStorage.getItem(
            `selectedDataset:${currentUser.email}`,
          );
          setManualDataset(
            saved && datasetsRes.datasets.includes(saved)
              ? saved
              : datasetsRes.datasets[0],
          );
        } else if (datasetsRes.datasets.length > 0) {
          setManualDataset(datasetsRes.datasets[0]);
        }
      } catch (error) {
        if (!mounted) return;
        if (!handleUnauthorized(error)) {
          redirectToLogin();
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [handleUnauthorized, redirectToLogin]);

  useEffect(() => {
    if (!authChecked || !user) return;

    let mounted = true;

    async function loadChats() {
      const response = await getAllChats(10, 0);
      if (!mounted) return;
      setChatSessions(response.chats ?? []);
      setHasLoadedChats(true);

      // Set active chat from URL if present, don't load its history yet
      if (initialChatId) setActiveChatId(initialChatId);
    }

    loadChats();

    return () => {
      mounted = false;
    };
  }, [authChecked, user, handleUnauthorized, initialChatId]);

  useEffect(() => {
    if (!hasLoadedChats || !activeChatId) return;
    if (loadedHistoryIds.current.has(activeChatId)) {
      // Re-insert to mark as most recently used
      loadedHistoryIds.current.delete(activeChatId);
      loadedHistoryIds.current.add(activeChatId);
      return;
    }

    // Evict LRU entry if at capacity
    if (loadedHistoryIds.current.size >= CONFIG.HISTORY_CACHE_LIMIT) {
      const lruId = loadedHistoryIds.current.values().next().value; // first = oldest
      if (lruId !== undefined) {
        loadedHistoryIds.current.delete(lruId);
        setChatStateById((prev) => {
          const next = { ...prev };
          delete next[lruId];
          return next;
        });
      }
    }

    loadedHistoryIds.current.add(activeChatId);

    updateChatState(activeChatId, (prev) => ({
      ...prev,
      isHistoryLoading: true,
    }));

    getChatHistory(activeChatId)
      .then((data) => {
        updateChatState(activeChatId, (prev) => ({
          ...prev,
          messages: cloneMessages(data.messages ?? []),
          dataset: data.dataset_name ?? null,
          isHistoryLoading: false,
        }));
      })
      .catch((err) => {
        updateChatState(activeChatId, (prev) => ({
          ...prev,
          isHistoryLoading: false,
        }));
        handleUnauthorized(err);
      });
  }, [activeChatId, hasLoadedChats]);

  const refreshSidebar = useCallback(
    async (chatId: string, force: boolean = false) => {
      if (!chatId) return;
      if (!force) {
        const isLocalOnly = !chatSessions.some((s) => s.id === chatId);
        if (isLocalOnly) return;
      }

      updateChatState(chatId, (prev) => ({
        ...prev,
        sidebarStatus: "Refreshing...",
      }));
      try {
        const fresh = await getChatState(chatId);
        updateChatState(chatId, (prev) => ({
          ...prev,
          sidebar: fresh,
          sidebarStatus: "Live",
        }));
      } catch (error) {
        if (handleUnauthorized(error)) return;
        updateChatState(chatId, (prev) => ({
          ...prev,
          sidebarStatus: "Offline",
        }));
      }
    },
    [handleUnauthorized, updateChatState, chatSessions],
  );

  useEffect(() => {
    if (!hasLoadedChats || !activeChatId) return;
    refreshSidebar(activeChatId);
  }, [activeChatId, hasLoadedChats, refreshSidebar]);

  const {
    messages,
    isStreaming,
    sidebar,
    sidebarStatus,
    tableIndex,
    provIndex,
    executionResult,
    queryInput,
    queryResult,
    isHistoryLoading,
  } = activeChat;

  const retrievedTables = sidebar?.retrieved_tables ?? {};
  const retrievedTableNames = useMemo(
    () => Object.keys(retrievedTables),
    [retrievedTables],
  );
  const provSteps = sidebar?.prov_steps ?? [];

  useEffect(() => {
    if (!activeChatId) return;
    updateChatState(activeChatId, (prev) =>
      prev.tableIndex === 0 ? prev : { ...prev, tableIndex: 0 },
    );
  }, [activeChatId, retrievedTableNames.length, updateChatState]);

  useEffect(() => {
    if (!activeChatId) return;
    updateChatState(activeChatId, (prev) =>
      prev.provIndex === 0 ? prev : { ...prev, provIndex: 0 },
    );
  }, [activeChatId, provSteps.length, updateChatState]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      clearStoredToken();
    } finally {
      setIsLoggingOut(false);
      redirectToLogin();
    }
  };

  const handleSend = async (content: string) => {
    const isNew = !activeChatId;
    const chatId = isNew ? generateUUID() : activeChatId;

    if (isNew) {
      loadedHistoryIds.current.add(chatId);
      setActiveChatId(chatId);
      window.history.replaceState(null, "", `/chat/${chatId}`);
    }

    const isNewChat = !chatSessions.some((session) => session.id === chatId);

    if (isNewChat) {
      const generatedTitle =
        content.length > 20 ? `${content.substring(0, 20)}...` : content;

      const newSession: ChatSession = {
        id: chatId,
        title: generatedTitle,
        lastActive: new Date().toISOString(),
      };

      setChatSessions((prev) => [newSession, ...prev]);
    }

    const currentMessages = chatStateById[chatId]?.messages ?? [];
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
    let thoughtsArray: string[] = [];

    try {
      for await (const event of streamChat({
        chat_id: chatId,
        message: content,
        dataset_name: selectedDataset,
      })) {
        if (event.sender === "log") {
          const cleanLog = event.text.replace(/^LOG\s*:\s*/i, ""); // Strip "LOG:" safely
          thoughtsArray = [...thoughtsArray, cleanLog];

          updateChatState(chatId, (prev) => {
            const updated = [...prev.messages];
            const current = updated[assistantIndex] ?? {
              role: "assistant" as const,
              content: "",
            };
            // Store logs inside the thoughts array property
            updated[assistantIndex] = { ...current, thoughts: thoughtsArray };
            return { ...prev, messages: updated, status: cleanLog };
          });
        }

        if (event.sender === "assistant") {
          assistantText += event.text;
          updateChatState(chatId, (prev) => {
            const updated = [...prev.messages];
            const current = updated[assistantIndex] ?? {
              role: "assistant" as const,
              content: "",
            };
            // Preserve thoughts while updating final content
            updated[assistantIndex] = {
              ...current,
              content: assistantText,
              thoughts: thoughtsArray,
            };
            return { ...prev, messages: updated };
          });
        }

        if (event.sender === "done") {
          updateChatState(chatId, (prev) => ({ ...prev, status: event.text }));
        }
      }
    } catch (error) {
      if (handleUnauthorized(error)) return;
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Stream failed.",
      }));
    } finally {
      updateChatState(chatId, (prev) => ({ ...prev, isStreaming: false }));
      refreshSidebar(chatId, true);
    }
  };

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      try {
        // 1. Call API route to delete the chat backend record
        await deleteChat(chatId);

        // 2. Remove from the local chat sessions list
        setChatSessions((prev) =>
          prev.filter((session) => session.id !== chatId),
        );

        // 3. Clear local runtime track state
        setChatStateById((prev) => {
          const next = { ...prev };
          delete next[chatId];
          return next;
        });

        // 4. If the deleted chat was the active one, clear selection and reset route
        if (activeChatId === chatId) {
          setActiveChatId("");
          router.push("/");
        }
      } catch (error) {
        if (handleUnauthorized(error)) return;
        console.error("Failed to delete chat:", error);
        alert("Could not delete the chat session. Please try again.");
      }
    },
    [activeChatId, router, handleUnauthorized],
  );

  const handleExecute = async () => {
    const chatId = activeChatId;
    if (!chatId) return;
    updateChatState(chatId, (prev) => ({
      ...prev,
      status: "Executing script...",
    }));
    try {
      const rows = await executeCode(chatId);
      updateChatState(chatId, (prev) => ({
        ...prev,
        executionResult: rows,
        status: "Execution finished.",
      }));
    } catch (error) {
      if (handleUnauthorized(error)) return;
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Execution failed.",
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
      const blob = await downloadTargetViews(chatId);
      saveBlob(blob, `${chatId}_tables.zip`);
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Tables downloaded.",
      }));
    } catch (error) {
      if (handleUnauthorized(error)) return;
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
      const blob = await downloadE2EScript(chatId);
      saveBlob(blob, `materializer_${chatId}.py`);
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Provenance downloaded.",
      }));
    } catch (error) {
      if (handleUnauthorized(error)) return;
      updateChatState(chatId, (prev) => ({
        ...prev,
        status: "Provenance export failed.",
      }));
    }
  };

  const handleCreateNewChatSlot = useCallback(() => {
    setActiveChatId("");
    router.push("/");
  }, [router]);

  if (!authChecked || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate/70">
        Checking session...
      </div>
    );
  }

  // Also show the column if sidebar is actively loading for a known chat
  const showInspector =
    hasSidebarContent(sidebar) ||
    (!!activeChatId &&
      chatSessions.some((s) => s.id === activeChatId) &&
      activeChat.sidebarStatus === "Refreshing...");

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      <div className="app-shell flex flex-1 min-h-0 flex-col overflow-hidden border border-white/70 p-3 lg:p-4 fade-in">
        <div
          className={`flex min-h-0 flex-1 ${isChatListOpen ? "gap-6" : "gap-0"}`}
        >
          <ChatSidebar
            chatSessions={chatSessions}
            activeChatId={activeChatId}
            setActiveChatId={(id) => {
              setActiveChatId(id);
              window.history.pushState(null, "", `/chat/${id}`);
            }}
            isOpen={isChatListOpen}
            onDeleteChat={handleDeleteChat}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AppHeader
              isChatListOpen={isChatListOpen}
              setIsChatListOpen={setIsChatListOpen}
              handleCreateNewChatSlot={handleCreateNewChatSlot}
              isUserMenuOpen={isUserMenuOpen}
              setIsUserMenuOpen={setIsUserMenuOpen}
              user={user}
              isLoggingOut={isLoggingOut}
              handleLogout={handleLogout}
              selectedDataset={selectedDataset}
              accessibleDatasets={accessibleDatasets}
              handleDatasetChange={setManualDataset}
              isDatasetLocked={!!activeChatId}
            />

            <div
              className={`mt-8 grid min-h-0 flex-1 gap-6 ${
                showInspector ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""
              }`}
            >
              <MainChatArea
                messages={messages}
                isStreaming={isStreaming}
                isHistoryLoading={isHistoryLoading}
                onSend={handleSend}
              />

              {showInspector && (
                <InspectorSidebar
                  activeChatId={activeChatId}
                  sidebar={sidebar}
                  tableIndex={tableIndex}
                  provIndex={provIndex}
                  executionResult={executionResult}
                  queryInput={queryInput}
                  queryResult={queryResult}
                  updateChatState={updateChatState}
                  onExecute={handleExecute}
                  onTableDownload={handleTableDownload}
                  onProvenanceDownload={handleProvenanceDownload}
                  sidebarStatus={sidebarStatus}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
