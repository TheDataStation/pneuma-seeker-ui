import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../lib/api/chat", () => ({
  queryTable: jest.fn(),
  downloadTableCSV: jest.fn(),
}));

import { TableExplorerModal } from "@/components/TableExplorerModal";
import { queryTable, downloadTableCSV } from "../../lib/api/chat";

const mockQueryTable = queryTable as jest.Mock;
const mockDownloadTableCSV = downloadTableCSV as jest.Mock;

const TWO_ROW_RESPONSE = {
  rows: [
    { id: 1, name: "Alice", city: "Chicago" },
    { id: 2, name: "Bob", city: "Los Angeles" },
  ],
  total_count: 2,
  columns: ["id", "name", "city"],
};

const defaultProps = {
  chatId: "chat-1",
  tableId: "my_table",
  tableName: "My Table",
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryTable.mockResolvedValue(TWO_ROW_RESPONSE);
  mockDownloadTableCSV.mockResolvedValue(new Blob(["id,name\n1,Alice\n"], { type: "text/csv" }));
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("TableExplorerModal – rendering", () => {
  it("shows a loading indicator before data arrives", () => {
    mockQueryTable.mockReturnValue(new Promise(() => {}));
    render(<TableExplorerModal {...defaultProps} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders the table name in the header", async () => {
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText("My Table")).toBeInTheDocument();
  });

  it("renders column headers after data loads", async () => {
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText("name"));
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("city")).toBeInTheDocument();
  });

  it("renders data rows after data loads", async () => {
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText("Alice"));
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Chicago")).toBeInTheDocument();
  });

  it("shows row/column count summary in the header", async () => {
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText(/2 rows/i));
    expect(screen.getByText(/3 columns/i)).toBeInTheDocument();
  });

  it("renders the search input", () => {
    render(<TableExplorerModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("renders the Close button", () => {
    render(<TableExplorerModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("shows error message when queryTable rejects", async () => {
    mockQueryTable.mockRejectedValue(new Error("Network failure"));
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText(/failed to load/i));
  });

  it("shows 'no rows match' when the result set is empty", async () => {
    mockQueryTable.mockResolvedValue({ rows: [], total_count: 0, columns: ["id"] });
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText(/no rows match/i));
  });

  it("includes a row-number column (#)", async () => {
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText("Alice"));
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
  });

  it("calls queryTable with the correct chatId and tableId on mount", async () => {
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() =>
      expect(mockQueryTable).toHaveBeenCalledWith(
        "chat-1",
        "my_table",
        expect.objectContaining({ limit: 50, offset: 0 }),
      )
    );
  });

  it("passes dataset_name to queryTable when provided", async () => {
    render(<TableExplorerModal {...defaultProps} datasetName="my_ds" />);
    await waitFor(() =>
      expect(mockQueryTable).toHaveBeenCalledWith(
        "chat-1",
        "my_table",
        expect.objectContaining({ dataset_name: "my_ds" }),
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Close behaviour
// ---------------------------------------------------------------------------

describe("TableExplorerModal – close", () => {
  it("calls onClose when the Close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<TableExplorerModal {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop overlay is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { container } = render(
      <TableExplorerModal {...defaultProps} onClose={onClose} />,
    );
    // The outer fixed backdrop div is the direct first child
    await user.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe("TableExplorerModal – sorting", () => {
  it("shows ↕ on unsorted column headers", async () => {
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText("name"));
    const nameHeader = screen.getByRole("columnheader", { name: /name/i });
    expect(nameHeader.textContent).toContain("↕");
  });

  it("clicking a column header re-fetches with order_by=asc", async () => {
    const user = userEvent.setup();
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText("name"));
    await user.click(screen.getByRole("columnheader", { name: /name/i }));
    await waitFor(() =>
      expect(mockQueryTable).toHaveBeenCalledWith(
        "chat-1",
        "my_table",
        expect.objectContaining({ order_by: "name", order_dir: "asc" }),
      )
    );
  });

  it("clicking the same column twice switches to desc", async () => {
    const user = userEvent.setup();
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText("name"));

    // First click → should fetch with asc
    await user.click(screen.getByRole("columnheader", { name: /name/i }));
    await waitFor(() =>
      expect(mockQueryTable).toHaveBeenCalledWith(
        "chat-1",
        "my_table",
        expect.objectContaining({ order_by: "name", order_dir: "asc" }),
      )
    );

    // Second click on the same column → should flip to desc
    await user.click(screen.getByRole("columnheader", { name: /name/i }));
    await waitFor(() =>
      expect(mockQueryTable).toHaveBeenCalledWith(
        "chat-1",
        "my_table",
        expect.objectContaining({ order_by: "name", order_dir: "desc" }),
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe("TableExplorerModal – search", () => {
  it("sends the typed search term to queryTable after debounce", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, "Illi");
    jest.advanceTimersByTime(400);

    await waitFor(() =>
      expect(mockQueryTable).toHaveBeenCalledWith(
        "chat-1",
        "my_table",
        expect.objectContaining({ search: "Illi" }),
      )
    );
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe("TableExplorerModal – pagination", () => {
  const BIG_RESPONSE = {
    rows: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })),
    total_count: 150,
    columns: ["id"],
  };

  it("shows pagination footer when total_count > PAGE_SIZE", async () => {
    mockQueryTable.mockResolvedValue(BIG_RESPONSE);
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText(/rows 1–50 of 150/i));
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("Prev button is disabled on the first page", async () => {
    mockQueryTable.mockResolvedValue(BIG_RESPONSE);
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /prev/i }));
    expect(screen.getByRole("button", { name: /prev/i })).toBeDisabled();
  });

  it("Next button is disabled on the last page", async () => {
    mockQueryTable.mockResolvedValue({
      rows: [{ id: 1 }],
      total_count: 1,
      columns: ["id"],
    });
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("clicking Next fetches the second page with offset=50", async () => {
    const user = userEvent.setup();
    mockQueryTable.mockResolvedValue(BIG_RESPONSE);
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(mockQueryTable).toHaveBeenCalledWith(
        "chat-1",
        "my_table",
        expect.objectContaining({ offset: 50 }),
      )
    );
  });

  it("shows page N / total in the footer", async () => {
    mockQueryTable.mockResolvedValue(BIG_RESPONSE);
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => screen.getByText("1 / 3"));
  });
});

// ---------------------------------------------------------------------------
// Download CSV
// ---------------------------------------------------------------------------

describe("TableExplorerModal – download", () => {
  beforeEach(() => {
    // jsdom doesn't implement URL.createObjectURL; stub it
    URL.createObjectURL = jest.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = jest.fn();

    // Intercept anchor clicks so jsdom doesn't complain about navigation
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the Download CSV button", async () => {
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /download csv/i })).toBeInTheDocument();
  });

  it("calls downloadTableCSV with chatId, tableId, and no datasetName", async () => {
    const user = userEvent.setup();
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /download csv/i }));
    await waitFor(() =>
      expect(mockDownloadTableCSV).toHaveBeenCalledWith(
        "chat-1",
        "my_table",
        { dataset_name: undefined },
      )
    );
  });

  it("passes datasetName to downloadTableCSV when provided", async () => {
    const user = userEvent.setup();
    render(<TableExplorerModal {...defaultProps} datasetName="my_ds" />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /download csv/i }));
    await waitFor(() =>
      expect(mockDownloadTableCSV).toHaveBeenCalledWith(
        "chat-1",
        "my_table",
        { dataset_name: "my_ds" },
      )
    );
  });

  it("shows 'Downloading...' while download is in progress", async () => {
    let resolve!: (blob: Blob) => void;
    mockDownloadTableCSV.mockReturnValue(new Promise<Blob>((res) => { resolve = res; }));

    const user = userEvent.setup();
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /download csv/i }));

    expect(screen.getByRole("button", { name: /downloading/i })).toBeDisabled();

    resolve(new Blob([""], { type: "text/csv" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download csv/i })).toBeEnabled()
    );
  });

  it("reverts button label after download completes", async () => {
    const user = userEvent.setup();
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /download csv/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download csv/i })).toBeEnabled()
    );
  });

  it("button remains enabled after downloadTableCSV rejects", async () => {
    mockDownloadTableCSV.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    render(<TableExplorerModal {...defaultProps} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /download csv/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download csv/i })).toBeEnabled()
    );
  });
});
