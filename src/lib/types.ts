// src/lib/types.ts
export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  thoughts?: string[];
}

export interface ChatRuntime {
  messages: ChatMessage[];
  isStreaming: boolean;
  status: string;
  sidebar: ChatStateResponse | null;
  sidebarStatus: string;
  tableIndex: number;
  provIndex: number;
  executionResult: TableRow[];
  queryInput: string;
  queryResult: TableRow[];
  isHistoryLoading: boolean;
};

export interface ChatSession {
  id: string;
  title: string;
  lastActive: string;
}

export interface ChatListResponse {
  chats: ChatSession[];
  has_more: boolean;
  next_offset: number | null;
}

export interface User {
  user_id: string;
  email: string;
  username: string;
  group_id: string | null;
  group_name: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
}

export interface Group {
  group_id: string;
  name: string;
  parent_group_id: string | null;
}

export interface RegisterRequest {
  email: string;
  password: string;
  group_id?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GroupCreateRequest {
  name: string;
  parent_group_id?: string | null;
}

export interface TableRow {
  [key: string]: string | number | boolean | null;
}

export interface ConductorState {
  T?: Record<string, TableRow[]>;
  S?: string | null;
  is_T_materialized?: boolean;
  is_S_executed?: boolean;
  column_descriptions?: Record<string, Record<string, string>>;
  [key: string]: unknown;
}

export interface ChatStateResponse {
  state: ConductorState;
  prov_steps: string[];
  retrieved_tables: Record<string, TableRow[]>;
}

export interface ChatStreamEvent {
  sender: "log" | "assistant" | "done";
  text: string;
  time_stamp: number;
}

export interface ChatRequest {
  chat_id?: string;
  message: string;
  data_source?: string | null;
  files?: unknown[];
}

export interface AccessibleDatasetResponse {
  datasets: string[];
}

export interface ChatHistoryResponse {
  user_id: string;
  chat_id: string;
  messages: ChatMessage[];
}

export interface ProvenanceNode {
  id: string;
  source_retriever: string;
  python_code: string;
  description: string;
  parents: string[];
  children: string[];
}

export interface ProvenanceNodesResponse {
  user_id: string;
  chat_id: string;
  node_count: number;
  nodes: ProvenanceNode[];
}
