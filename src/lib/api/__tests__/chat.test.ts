import { streamChat, getAllChats, deleteChat, getAccessibleDatasets, downloadTargetViews, downloadE2EScript, queryTable, downloadTableCSV } from "@/lib/api/chat";
import { TextDecoder as NodeTextDecoder } from "util";

// jsdom may not provide TextDecoder in all versions; polyfill from Node's util module
if (typeof global.TextDecoder === "undefined") {
  (global as unknown as Record<string, unknown>).TextDecoder = NodeTextDecoder;
}

const BASE = "http://localhost:8000";

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: build a mock reader that yields NDJSON lines
// ---------------------------------------------------------------------------

function makeNdjsonReader(lines: string[]) {
  const chunks = lines.map((l) => Buffer.from(l + "\n") as unknown as Uint8Array);
  let index = 0;
  return {
    read: jest.fn().mockImplementation(() => {
      if (index < chunks.length) {
        return Promise.resolve({ value: chunks[index++], done: false });
      }
      return Promise.resolve({ value: undefined, done: true });
    }),
  };
}

function mockStreamFetch(lines: string[], status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    body: { getReader: () => makeNdjsonReader(lines) },
    json: jest.fn().mockResolvedValue({}),
  });
}

function mockJsonFetch(status: number, body: unknown, ok = status < 400) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

// ---------------------------------------------------------------------------
// streamChat
// ---------------------------------------------------------------------------

describe("streamChat", () => {
  it("yields parsed NDJSON events from the response body", async () => {
    const lines = [
      JSON.stringify({ sender: "log", text: "thinking", time_stamp: 1 }),
      JSON.stringify({ sender: "assistant", text: "hello", time_stamp: 2 }),
      JSON.stringify({ sender: "done", text: "Ready", time_stamp: 3 }),
    ];
    mockStreamFetch(lines);

    const events = [];
    for await (const event of streamChat({ message: "hi", chat_id: "c1" })) {
      events.push(event);
    }

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ sender: "log", text: "thinking", time_stamp: 1 });
    expect(events[1]).toEqual({ sender: "assistant", text: "hello", time_stamp: 2 });
    expect(events[2]).toEqual({ sender: "done", text: "Ready", time_stamp: 3 });
  });

  it("calls POST /chat/ with the message payload", async () => {
    mockStreamFetch([]);
    const gen = streamChat({ message: "test", chat_id: "c1", dataset_name: "db1" });
    for await (const _ of gen) { /* drain */ }

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/chat/`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ message: "test", chat_id: "c1", dataset_name: "db1" }),
      }),
    );
  });

  it("includes Authorization header when token is stored", async () => {
    localStorage.setItem("token", "mytoken");
    mockStreamFetch([]);
    const gen = streamChat({ message: "hi" });
    for await (const _ of gen) { /* drain */ }

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer mytoken");
  });

  it("throws ApiError when the response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ detail: "Unauthorized" }),
    });
    const gen = streamChat({ message: "hi" });
    await expect(gen.next()).rejects.toMatchObject({ status: 401, message: "Unauthorized" });
  });

  it("skips malformed NDJSON lines without throwing", async () => {
    mockStreamFetch([
      "not-valid-json",
      JSON.stringify({ sender: "assistant", text: "ok", time_stamp: 1 }),
    ]);

    const events = [];
    for await (const event of streamChat({ message: "hi" })) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0].sender).toBe("assistant");
  });
});

// ---------------------------------------------------------------------------
// getAllChats
// ---------------------------------------------------------------------------

describe("getAllChats", () => {
  beforeEach(() => {
    mockJsonFetch(200, { chats: [], has_more: false, next_offset: null });
  });

  it("calls GET /chat/sessions with limit and offset params", async () => {
    await getAllChats(10, 0);
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/chat/sessions");
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=0");
  });

  it("includes query param when provided", async () => {
    await getAllChats(10, 0, "search term");
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("query=search+term");
  });

  it("omits query param when not provided", async () => {
    await getAllChats(10, 0);
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).not.toContain("query=");
  });
});

// ---------------------------------------------------------------------------
// deleteChat
// ---------------------------------------------------------------------------

describe("deleteChat", () => {
  it("calls DELETE /chat/:id", async () => {
    mockJsonFetch(200, { detail: "Deleted" });
    await deleteChat("c1");
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/chat/c1");
    expect(options.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// getAccessibleDatasets
// ---------------------------------------------------------------------------

describe("getAccessibleDatasets", () => {
  it("calls GET /chat/datasets and returns the dataset list", async () => {
    mockJsonFetch(200, { datasets: ["db1", "db2"] });
    const result = await getAccessibleDatasets();
    expect(result.datasets).toEqual(["db1", "db2"]);
  });
});

// ---------------------------------------------------------------------------
// downloadTargetViews
// ---------------------------------------------------------------------------

describe("downloadTargetViews", () => {
  it("returns a Blob on success", async () => {
    const mockBlob = new Blob(["zipdata"], { type: "application/zip" });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, blob: jest.fn().mockResolvedValue(mockBlob) });
    const result = await downloadTargetViews("c1");
    expect(result).toBe(mockBlob);
  });

  it("throws ApiError on non-OK response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, blob: jest.fn() });
    await expect(downloadTargetViews("c1")).rejects.toMatchObject({ status: 404 });
  });

  it("calls the correct endpoint", async () => {
    const mockBlob = new Blob([""]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, blob: jest.fn().mockResolvedValue(mockBlob) });
    await downloadTargetViews("c1");
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/chat/target_views/c1");
  });
});

// ---------------------------------------------------------------------------
// downloadE2EScript
// ---------------------------------------------------------------------------

describe("downloadE2EScript", () => {
  it("returns a Blob on success", async () => {
    const mockBlob = new Blob(["script"], { type: "text/x-python" });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, blob: jest.fn().mockResolvedValue(mockBlob) });
    const result = await downloadE2EScript("c1");
    expect(result).toBe(mockBlob);
  });

  it("throws ApiError on non-OK response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, blob: jest.fn() });
    await expect(downloadE2EScript("c1")).rejects.toMatchObject({ status: 500 });
  });
});

// ---------------------------------------------------------------------------
// queryTable
// ---------------------------------------------------------------------------

describe("queryTable", () => {
  const successPayload = {
    rows: [{ id: 1, name: "Alice" }],
    total_count: 42,
    columns: ["id", "name"],
  };

  beforeEach(() => {
    mockJsonFetch(200, successPayload);
  });

  it("calls GET /chat/table_query/:chatId with table_id param", async () => {
    await queryTable("chat1", "my_table", {});
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/chat/table_query/chat1");
    expect(url).toContain("table_id=my_table");
  });

  it("returns rows, total_count, and columns from the response", async () => {
    const result = await queryTable("chat1", "t", {});
    expect(result.total_count).toBe(42);
    expect(result.columns).toEqual(["id", "name"]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ id: 1, name: "Alice" });
  });

  it("includes limit and offset when provided", async () => {
    await queryTable("chat1", "t", { limit: 25, offset: 50 });
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("limit=25");
    expect(url).toContain("offset=50");
  });

  it("includes order_by and order_dir when provided", async () => {
    await queryTable("chat1", "t", { order_by: "name", order_dir: "desc" });
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("order_by=name");
    expect(url).toContain("order_dir=desc");
  });

  it("includes search param when provided", async () => {
    await queryTable("chat1", "t", { search: "alice" });
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("search=alice");
  });

  it("includes dataset_name param when provided", async () => {
    await queryTable("chat1", "t", { dataset_name: "my_ds" });
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("dataset_name=my_ds");
  });

  it("omits optional params when not provided", async () => {
    await queryTable("chat1", "t", {});
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).not.toContain("search=");
    expect(url).not.toContain("dataset_name=");
    expect(url).not.toContain("order_by=");
  });

  it("uses GET method", async () => {
    await queryTable("chat1", "t", {});
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe("GET");
  });

  it("throws ApiError on non-OK response", async () => {
    mockJsonFetch(404, { detail: "Not found" }, false);
    await expect(queryTable("chat1", "t", {})).rejects.toMatchObject({ status: 404 });
  });
});

// ---------------------------------------------------------------------------
// downloadTableCSV
// ---------------------------------------------------------------------------

describe("downloadTableCSV", () => {
  const mockCsvBlob = new Blob(["id,name\n1,Alice\n"], { type: "text/csv" });

  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, blob: jest.fn().mockResolvedValue(mockCsvBlob) });
  });

  it("calls the correct endpoint with table_id param", async () => {
    await downloadTableCSV("chat1", "my_table", {});
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/chat/table_download/chat1");
    expect(url).toContain("table_id=my_table");
  });

  it("returns a Blob on success", async () => {
    const result = await downloadTableCSV("chat1", "t", {});
    expect(result).toBe(mockCsvBlob);
  });

  it("includes dataset_name in the URL when provided", async () => {
    await downloadTableCSV("chat1", "t", { dataset_name: "my_ds" });
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("dataset_name=my_ds");
  });

  it("omits dataset_name from the URL when not provided", async () => {
    await downloadTableCSV("chat1", "t", {});
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).not.toContain("dataset_name=");
  });

  it("uses GET method", async () => {
    await downloadTableCSV("chat1", "t", {});
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe("GET");
  });

  it("sends Authorization header when a token is stored", async () => {
    localStorage.setItem("token", "tok-abc");
    await downloadTableCSV("chat1", "t", {});
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers).toMatchObject({ Authorization: "Bearer tok-abc" });
  });

  it("throws ApiError on non-OK response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404, blob: jest.fn() });
    await expect(downloadTableCSV("chat1", "t", {})).rejects.toMatchObject({ status: 404 });
  });
});
