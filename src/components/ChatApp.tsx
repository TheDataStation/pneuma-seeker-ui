// src/components/ChatApp.tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatSidebar } from "@/components/ChatSidebar";
import { MainChatArea } from "@/components/MainChatArea";
import { InspectorSidebar, hasSidebarContent } from "@/components/InspectorSidebar";

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
} from "@/lib/api";

import type {
    User,
    ChatSession,
    ChatStateResponse,
    ChatMessage as ChatMessageType,
    TableRow,
} from "@/lib/types";
import { saveBlob } from "@/lib/utils";

const CHAT_LIST_PREF_KEY = "pneuma:pref:chatListOpen";

type ChatRuntime = {
    messages: ChatMessageType[];
    isStreaming: boolean;
    status: string;
    sidebar: ChatStateResponse | null;
    sidebarStatus: string;
    tableIndex: number;
    provIndex: number;
    executionResult: TableRow[];
    queryInput: string;
    queryResult: TableRow[];
};

const cloneMessages = (messages: ChatMessageType[]): ChatMessageType[] =>
    messages.map((message) => ({ ...message }));

const createChatRuntime = (messages: ChatMessageType[] = []): ChatRuntime => ({
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

function clearStoredToken() {
    if (typeof window !== "undefined") {
        localStorage.removeItem("token");
    }
}

function generateUUID(): string {
    if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
}

export function ChatApp({ initialChatId }: { initialChatId?: string }) {
    const router = useRouter();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [chatStateById, setChatStateById] = useState<Record<string, ChatRuntime>>({});
    const [activeChatId, setActiveChatId] = useState(initialChatId ?? "");
    const [isChatListOpen, setIsChatListOpen] = useState(true);
    const [hasLoadedChats, setHasLoadedChats] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const userMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const emptyRuntime = useMemo(() => createChatRuntime(), []);

    const activeChat = activeChatId
        ? (chatStateById[activeChatId] ?? emptyRuntime)
        : emptyRuntime;

    const updateChatState = useCallback(
        (chatId: string, updater: (current: ChatRuntime) => ChatRuntime) => {
            setChatStateById((prev) => {
                const current = prev[chatId] ?? createChatRuntime();
                const updated = updater(current);
                if (updated === current) return prev;
                return { ...prev, [chatId]: updated };
            });
        },
        []
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
        [redirectToLogin]
    );

    useEffect(() => {
        let mounted = true;

        async function bootstrap() {
            if (typeof window !== "undefined" && !localStorage.getItem("token")) {
                redirectToLogin();
                return;
            }

            try {
                const currentUser = await getCurrentUser();
                if (!mounted) return;
                setUser(currentUser);
                setAuthChecked(true);
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
            try {
                const response = await getAllChats(10, 0);
                if (!mounted) return;

                const sessions = response.chats || [];
                setChatSessions(sessions);

                const histories = await Promise.all(
                    sessions.map((chat) => getChatHistory(chat.id))
                );

                if (!mounted) return;

                // Build the state map as a plain object (not updater fn) so the
                // update is synchronous with setActiveChatId below — both land in
                // the same React batch and the active chat is never missing.
                const next: Record<string, ChatRuntime> = {};
                sessions.forEach((chat, idx) => {
                    next[chat.id] = createChatRuntime(histories[idx]?.messages ?? []);
                });
                setChatStateById(next);

                // Always respect the URL — do not override activeChatId when one
                // was provided via props (i.e. the user opened /chat/<id>).
                if (initialChatId) {
                    setActiveChatId(initialChatId);
                }
                // If no initialChatId (bare / route) leave activeChatId as "" so
                // the empty-state welcome screen shows.

                setHasLoadedChats(true);
            } catch (error) {
                if (handleUnauthorized(error)) return;
                console.error(error);
            }
        }

        loadChats();

        return () => {
            mounted = false;
        };
    }, [authChecked, user, handleUnauthorized, initialChatId]);

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
        [handleUnauthorized, updateChatState, chatSessions]
    );

    useEffect(() => {
        if (!hasLoadedChats || !activeChatId) return;
        refreshSidebar(activeChatId);
    }, [activeChatId, hasLoadedChats, refreshSidebar]);

    const {
        messages,
        isStreaming,
        sidebar,
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
    }, [activeChatId, retrievedTableNames.length, updateChatState]);

    useEffect(() => {
        if (!activeChatId) return;
        updateChatState(activeChatId, (prev) =>
            prev.provIndex === 0 ? prev : { ...prev, provIndex: 0 }
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
            for await (const event of streamChat({ chat_id: chatId, message: content })) {
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
                        updated[assistantIndex] = { ...current, content: assistantText, thoughts: thoughtsArray };
                        return { ...prev, messages: updated };
                    });
                }

                if (event.sender === "done") {
                    updateChatState(chatId, (prev) => ({ ...prev, status: event.text }));
                }
            }
        } catch (error) {
            if (handleUnauthorized(error)) return;
            updateChatState(chatId, (prev) => ({ ...prev, status: "Stream failed." }));
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
                setChatSessions((prev) => prev.filter((session) => session.id !== chatId));

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
        [activeChatId, router, handleUnauthorized]
    );

    const handleExecute = async () => {
        const chatId = activeChatId;
        if (!chatId) return;
        updateChatState(chatId, (prev) => ({ ...prev, status: "Executing script..." }));
        try {
            const rows = await executeCode(chatId);
            updateChatState(chatId, (prev) => ({
                ...prev,
                executionResult: rows,
                status: "Execution finished.",
            }));
        } catch (error) {
            if (handleUnauthorized(error)) return;
            updateChatState(chatId, (prev) => ({ ...prev, status: "Execution failed." }));
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
            updateChatState(chatId, (prev) => ({ ...prev, status: "Tables downloaded." }));
        } catch (error) {
            if (handleUnauthorized(error)) return;
            updateChatState(chatId, (prev) => ({ ...prev, status: "Table export failed." }));
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

    const showInspector = hasSidebarContent(sidebar);

    return (
        <div className="flex h-screen flex-1 flex-col overflow-hidden">
            <div className="app-shell flex flex-1 min-h-0 flex-col overflow-hidden border border-white/70 p-3 lg:p-4 fade-in">
                <div className={`flex min-h-0 flex-1 ${isChatListOpen ? "gap-6" : "gap-0"}`}>
                    <ChatSidebar
                        chatSessions={chatSessions}
                        activeChatId={activeChatId}
                        setActiveChatId={(id) => {
                            setActiveChatId(id);
                            router.push(`/chat/${id}`);
                        }}
                        isOpen={isChatListOpen}
                        onDeleteChat={handleDeleteChat}
                    />

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <header className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    className="cursor-pointer duration-300 hover:brightness-90 rounded-full border border-sand-strong/70 bg-white p-2 text-slate"
                                    onClick={() => setIsChatListOpen((prev) => !prev)}
                                    aria-pressed={isChatListOpen}
                                    aria-label={isChatListOpen ? "Hide chats" : "Show chats"}
                                    title={isChatListOpen ? "Hide chats" : "Show chats"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <path d="M9 3v18" />
                                    </svg>
                                </button>

                                <button
                                    className="cursor-pointer duration-300 hover:brightness-90 rounded-full border border-sand-strong/70 bg-white p-2 text-slate"
                                    onClick={handleCreateNewChatSlot}
                                    aria-label="New chat"
                                    title="New chat"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                    </svg>
                                </button>

                                <div>
                                    <h1 className="font-display text-2xl text-ink sm:text-2xl">
                                        Pneuma-Seeker
                                    </h1>
                                </div>
                            </div>
                            <div className="relative">
                                <button
                                    type="button"
                                    className="cursor-pointer duration-300 hover:brightness-90 rounded-full border border-[#6b0000] bg-[#800000] p-2 text-white"
                                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                                    aria-label="User menu"
                                    title="User menu"
                                    aria-expanded={isUserMenuOpen}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                    </svg>
                                </button>

                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-sand-strong/70 bg-white shadow-lg z-50 overflow-hidden">
                                        <div className="px-4 py-3 text-xs text-slate border-b border-sand-strong/30 truncate">
                                            Email: {user.email}
                                        </div>
                                        <div className="px-4 py-3 text-xs text-slate border-b border-sand-strong/30 truncate">
                                            Group: {user.group_name}
                                        </div>
                                        <button
                                            type="button"
                                            className="w-full text-left cursor-pointer duration-300 hover:bg-red-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#800000] disabled:opacity-60"
                                            onClick={() => { handleLogout(); setIsUserMenuOpen(false); }}
                                            disabled={isLoggingOut}
                                        >
                                            {isLoggingOut ? "Signing out..." : "Log out"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </header>

                        <div
                            className={`mt-8 grid min-h-0 flex-1 gap-6 ${showInspector ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""
                                }`}
                        >
                            <MainChatArea
                                messages={messages}
                                isStreaming={isStreaming}
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
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
