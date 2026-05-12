export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatSession = {
  id: string;
  title: string;
  summary: string;
  lastActive: string;
};

export type TableRow = Record<string, string | number | boolean | null>;

export type SidebarState = {
  state: {
    T?: Record<string, TableRow[]>;
    S?: string | null;
    is_T_materialized?: boolean;
    is_S_executed?: boolean;
    column_descriptions?: Record<string, Record<string, string>>;
  };
  retrieved_tables: Record<string, TableRow[]>;
  prov_steps: string[];
};

export type ChatStreamEvent = {
  sender: "log" | "assistant" | "done";
  text: string;
  time_stamp: number;
};

export type StateQueryResult = {
  result: TableRow[];
  script?: string | null;
};
