import type {
  ChatMessage,
  ChatSession,
  ChatStreamEvent,
  SidebarState,
  StateQueryResult,
  TableRow,
} from "./types";
import chatDummy from "./chat_dummy.json";
import { downloadBlob } from "./utils";

const DEFAULT_BASE =
  process.env.NEXT_PUBLIC_PNEUMA_API_BASE ?? "http://localhost:8000";

type SeededChatData = {
  chats: ChatSession[];
  messages: Record<string, ChatMessage[]>;
};

const seededChatData = chatDummy as SeededChatData;

function getSeededChatList(): ChatSession[] {
  return seededChatData.chats;
}

function getSeededChatMessages(chatId: string): ChatMessage[] {
  const fallbackId = seededChatData.chats[0]?.id;
  return (
    seededChatData.messages[chatId] ??
    (fallbackId ? seededChatData.messages[fallbackId] : []) ??
    []
  );
}

export function getApiBase(): string {
  if (typeof window === "undefined") return DEFAULT_BASE;
  if (window.location.hostname === "localhost") return "http://localhost:8000";
  return DEFAULT_BASE;
}

export async function fetchChatSessions(userId: string): Promise<ChatSession[]> {
  try {
    const response = await fetch(`${getApiBase()}/chats/${userId}`, {
      method: "GET",
    });
    if (response.ok) {
      return (await response.json()) as ChatSession[];
    }
  } catch {
    // Fall back to seeded data when the backend is unavailable.
  }
  return getSeededChatList();
}

export async function fetchChatHistory(
  userId: string,
  chatId: string
): Promise<ChatMessage[]> {
  try {
    const response = await fetch(
      `${getApiBase()}/chats/${userId}/${chatId}`,
      { method: "GET" }
    );
    if (response.ok) {
      return (await response.json()) as ChatMessage[];
    }
  } catch {
    // Fall back to seeded data when the backend is unavailable.
  }
  return getSeededChatMessages(chatId);
}

export async function streamChat(
  userId: string,
  chatId: string,
  messages: ChatMessage[],
  files: unknown[] = [],
  onEvent?: (event: ChatStreamEvent) => void
): Promise<void> {
  const response = await fetch(`${getApiBase()}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, chat_id: chatId, messages, files }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Chat request failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as ChatStreamEvent;
        onEvent?.(event);
      } catch {
        // Ignore malformed chunks.
      }
    }
  }
}

export async function fetchCombinedState(
  userId: string,
  chatId: string
): Promise<SidebarState> {
  const response = await fetch(
    `${getApiBase()}/combined/state/${userId}/${chatId}`,
    { method: "GET" }
  );
  if (!response.ok) {
    throw new Error("Failed to load sidebar state.");
  }
  return (await response.json()) as SidebarState;
}

export async function executeCode(
  userId: string,
  chatId: string
): Promise<TableRow[]> {
  const response = await fetch(
    `${getApiBase()}/execute_code/${userId}/${chatId}`,
    { method: "GET" }
  );
  if (!response.ok) {
    throw new Error("Execution failed.");
  }
  return (await response.json()) as TableRow[];
}

export async function askState(
  userId: string,
  chatId: string,
  message: string
): Promise<StateQueryResult> {
  const response = await fetch(`${getApiBase()}/ask-state/${userId}/${chatId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    throw new Error("State query failed.");
  }
  return (await response.json()) as StateQueryResult;
}

export async function downloadTables(userId: string, chatId: string): Promise<void> {
  const response = await fetch(`${getApiBase()}/all_tables/${userId}/${chatId}`);
  if (!response.ok) {
    throw new Error("Table download failed.");
  }
  await downloadBlob(response, `${userId}_${chatId}_tables.zip`);
}

export async function downloadProvenance(
  userId: string,
  chatId: string
): Promise<void> {
  const response = await fetch(
    `${getApiBase()}/materializer_code/${userId}/${chatId}`
  );
  if (!response.ok) {
    throw new Error("Provenance download failed.");
  }
  await downloadBlob(response, `materializer_${userId}_${chatId}.py`);
}

export async function downloadChatPdf(
  chatId: string,
  model: string,
  messages: ChatMessage[]
): Promise<void> {
  const response = await fetch(`${getApiBase()}/download_chat_pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, model, messages }),
  });
  if (!response.ok) {
    throw new Error("Chat export failed.");
  }
  await downloadBlob(response, `chat_${chatId}.pdf`);
}
