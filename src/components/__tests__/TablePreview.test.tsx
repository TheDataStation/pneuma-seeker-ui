import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TablePreview } from "@/components/TablePreview";
import type { TableRow } from "@/lib/types";

const rows: TableRow[] = [
  { id: 1, name: "Alice", active: true },
  { id: 2, name: "Bob", active: false },
];

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("TablePreview – rendering", () => {
  it("renders column headers from the row keys", () => {
    render(<TablePreview rows={rows} />);
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders cell values for each row", () => {
    render(<TablePreview rows={rows} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByText("1")[0]).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders the title when provided", () => {
    render(<TablePreview rows={rows} title="My Table" />);
    expect(screen.getByText("My Table")).toBeInTheDocument();
  });

  it("does not render a title element when title is omitted", () => {
    const { container } = render(<TablePreview rows={rows} />);
    // The title is rendered as a <div class="...uppercase...">, whereas column headers
    // use <thead class="...uppercase..."> — querySelector("div.uppercase") is specific.
    expect(container.querySelector("div.uppercase")).not.toBeInTheDocument();
  });

  it("shows 'Empty table' header when rows array is empty", () => {
    render(<TablePreview rows={[]} />);
    expect(screen.getByText("Empty table")).toBeInTheDocument();
  });

  it("shows 'No rows yet.' when rows array is empty", () => {
    render(<TablePreview rows={[]} />);
    expect(screen.getByText("No rows yet.")).toBeInTheDocument();
  });

  it("stringifies null values as empty string", () => {
    render(<TablePreview rows={[{ col: null }]} />);
    const cells = screen.getAllByRole("cell");
    expect(cells.some((c) => c.textContent === "")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Column descriptions
// ---------------------------------------------------------------------------

describe("TablePreview – column descriptions", () => {
  it("sets the title attribute on column headers from columnDescriptions", () => {
    render(
      <TablePreview
        rows={rows}
        columnDescriptions={{
          name: "User's full name",
          id: "Unique identifier",
        }}
      />,
    );
    const nameHeader = screen.getByText("name").closest("th");
    expect(nameHeader).toHaveAttribute("title", "User's full name");
  });

  it("sets empty title when column description is absent", () => {
    render(<TablePreview rows={rows} columnDescriptions={{ name: "desc" }} />);
    const idHeader = screen.getByText("id").closest("th");
    expect(idHeader).toHaveAttribute("title", "");
  });
});

// ---------------------------------------------------------------------------
// Expand button
// ---------------------------------------------------------------------------

describe("TablePreview – expand button", () => {
  it("does not render Expand button when onExpand is not provided", () => {
    render(<TablePreview rows={rows} />);
    expect(screen.queryByRole("button", { name: /expand/i })).not.toBeInTheDocument();
  });

  it("renders Expand button when onExpand is provided", () => {
    render(<TablePreview rows={rows} onExpand={jest.fn()} />);
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
  });

  it("calls onExpand when the Expand button is clicked", async () => {
    const user = userEvent.setup();
    const onExpand = jest.fn();
    render(<TablePreview rows={rows} onExpand={onExpand} />);
    await user.click(screen.getByRole("button", { name: /expand/i }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it("renders Expand button alongside the title", () => {
    render(<TablePreview rows={rows} title="My Table" onExpand={jest.fn()} />);
    expect(screen.getByText("My Table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
  });

  it("renders Expand button with no title when title is omitted", () => {
    render(<TablePreview rows={rows} onExpand={jest.fn()} />);
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
  });

  it("does not render a title element when onExpand is provided but title is omitted", () => {
    const { container } = render(<TablePreview rows={rows} onExpand={jest.fn()} />);
    expect(container.querySelector("div.truncate")).not.toBeInTheDocument();
  });
});
