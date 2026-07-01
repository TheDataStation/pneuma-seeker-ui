import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// marked uses ES module syntax and can't be parsed by Jest without transforms
jest.mock("marked", () => ({
  marked: { parse: (text: string) => `<p>${text}</p>` },
}));

jest.mock("../../lib/api/chat", () => ({
  explainScript: jest.fn(),
}));

// Stub TableExplorerModal so InspectorSidebar tests don't need to deal with
// its internal queryTable fetch. Tests for modal behaviour live in
// TableExplorerModal.test.tsx.
jest.mock("../TableExplorerModal", () => ({
  TableExplorerModal: ({
    tableName,
    onClose,
  }: {
    tableName: string;
    onClose: () => void;
  }) => (
    <div data-testid="table-explorer-modal">
      <span>{tableName}</span>
      <button onClick={onClose}>Close Explorer</button>
    </div>
  ),
}));

import {
  InspectorSidebar,
  hasSidebarContent,
} from "@/components/InspectorSidebar";
import { explainScript } from "../../lib/api/chat";
import type { ChatStateResponse, TableRow } from "@/lib/types";

const mockExplainScript = explainScript as jest.Mock;

// ---------------------------------------------------------------------------
// hasSidebarContent (pure function)
// ---------------------------------------------------------------------------

describe("hasSidebarContent", () => {
  it("returns false for null", () => {
    expect(hasSidebarContent(null)).toBe(false);
  });

  it("returns false when all sections are empty", () => {
    expect(
      hasSidebarContent({ retrieved_tables: {}, prov_steps: [], state: {} }),
    ).toBe(false);
  });

  it("returns true when retrieved_tables is non-empty", () => {
    expect(
      hasSidebarContent({
        retrieved_tables: { t1: [] },
        prov_steps: [],
        state: {},
      }),
    ).toBe(true);
  });

  it("returns true when prov_steps is non-empty", () => {
    expect(
      hasSidebarContent({
        retrieved_tables: {},
        prov_steps: ["step1"],
        state: {},
      }),
    ).toBe(true);
  });

  it("returns true when state has target views (T)", () => {
    expect(
      hasSidebarContent({
        retrieved_tables: {},
        prov_steps: [],
        state: { T: { view1: [] } },
      }),
    ).toBe(true);
  });

  it("returns true when state has a script (S)", () => {
    expect(
      hasSidebarContent({
        retrieved_tables: {},
        prov_steps: [],
        state: { S: "print('x')" },
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// InspectorSidebar component
// ---------------------------------------------------------------------------

const mockSidebar: ChatStateResponse = {
  retrieved_tables: { users: [{ id: 1, name: "Alice" }] as TableRow[] },
  prov_steps: ["**Step 1**: prepare data"],
  state: {
    S: "print('hello')",
    T: { output: [{ col: "val" }] as TableRow[] },
    is_T_materialized: true,
  },
};

const defaultProps = {
  activeChatId: "chat-1",
  sidebar: mockSidebar,
  tableIndex: 0,
  provIndex: 0,
  executionResult: [] as TableRow[],
  queryInput: "",
  queryResult: [] as TableRow[],
  sidebarStatus: "Live",
  updateChatState: jest.fn(),
  onExecute: jest.fn(),
  onTableDownload: jest.fn(),
  onProvenanceDownload: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockExplainScript.mockResolvedValue({ description: "This script computes results." });
});

describe("InspectorSidebar – step rendering", () => {
  it("renders the Analysis Pipeline heading", () => {
    render(<InspectorSidebar {...defaultProps} />);
    expect(screen.getByText("Analysis Pipeline")).toBeInTheDocument();
  });

  it("renders all three step section headers", () => {
    render(<InspectorSidebar {...defaultProps} />);
    expect(screen.getByText("Retrieve Tables")).toBeInTheDocument();
    expect(screen.getByText("Materialize Views")).toBeInTheDocument();
    expect(screen.getByText("Execute Script")).toBeInTheDocument();
  });

  it("returns null when sidebar has no content", () => {
    const { container } = render(
      <InspectorSidebar
        {...defaultProps}
        sidebar={{ retrieved_tables: {}, prov_steps: [], state: {} }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render Retrieve Tables step when retrieved_tables is empty", () => {
    render(
      <InspectorSidebar
        {...defaultProps}
        sidebar={{ ...mockSidebar, retrieved_tables: {} }}
      />,
    );
    expect(screen.queryByText("Retrieve Tables")).not.toBeInTheDocument();
  });
});

describe("InspectorSidebar – section expand/collapse", () => {
  it("section content is collapsed by default", () => {
    render(<InspectorSidebar {...defaultProps} />);
    expect(screen.queryByText("print('hello')")).not.toBeInTheDocument();
  });

  it("clicking a section header expands its content", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByText("print('hello')")).toBeInTheDocument();
  });

  it("clicking an expanded section header collapses it again", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByText("Execute Script"));
    expect(screen.queryByText("print('hello')")).not.toBeInTheDocument();
  });

  it("expanding Execute Script shows the Execute script button", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    expect(
      screen.getByRole("button", { name: /execute script/i }),
    ).toBeInTheDocument();
  });

  it("Execute script button calls onExecute when clicked", async () => {
    const onExecute = jest.fn();
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} onExecute={onExecute} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /execute script/i }));
    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it("shows execution result table when executionResult is non-empty", async () => {
    const user = userEvent.setup();
    render(
      <InspectorSidebar
        {...defaultProps}
        executionResult={[{ result: "42" }] as TableRow[]}
      />,
    );
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByText("Execution result")).toBeInTheDocument();
  });

  it("expanding Retrieve Tables shows table content (table name as title)", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Retrieve Tables"));
    expect(screen.getByText("users")).toBeInTheDocument();
  });
});

describe("InspectorSidebar – table expand", () => {
  it("shows Expand button in Retrieve Tables section when expanded", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Retrieve Tables"));
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
  });

  it("clicking Expand on a retrieved table opens the explorer modal", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Retrieve Tables"));
    await user.click(screen.getByRole("button", { name: /expand/i }));
    expect(screen.getByTestId("table-explorer-modal")).toBeInTheDocument();
  });

  it("modal shows the retrieved table name", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Retrieve Tables"));
    await user.click(screen.getByRole("button", { name: /expand/i }));
    expect(screen.getByTestId("table-explorer-modal")).toHaveTextContent("users");
  });

  it("modal closes when its onClose callback is invoked", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Retrieve Tables"));
    await user.click(screen.getByRole("button", { name: /expand/i }));
    expect(screen.getByTestId("table-explorer-modal")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /close explorer/i }));
    expect(screen.queryByTestId("table-explorer-modal")).not.toBeInTheDocument();
  });

  it("shows Expand button in Materialize Views when a target view is present", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Materialize Views"));
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
  });

  it("does not show Expand button in Execute Script when executionResult is empty", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} executionResult={[]} />);
    await user.click(screen.getByText("Execute Script"));
    expect(screen.queryByRole("button", { name: /expand/i })).not.toBeInTheDocument();
  });

  it("shows Expand button in Execute Script when executionResult has rows", async () => {
    const user = userEvent.setup();
    render(
      <InspectorSidebar
        {...defaultProps}
        executionResult={[{ result: "42" }] as TableRow[]}
      />,
    );
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
  });

  it("clicking Expand on execution result opens modal with 'Execution result' title", async () => {
    const user = userEvent.setup();
    render(
      <InspectorSidebar
        {...defaultProps}
        executionResult={[{ result: "42" }] as TableRow[]}
      />,
    );
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /expand/i }));
    expect(screen.getByTestId("table-explorer-modal")).toHaveTextContent(
      "Execution result",
    );
  });
});

describe("InspectorSidebar – copy script", () => {
  it("shows Copy button when script is present", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("calls clipboard.writeText with the script when Copy is clicked", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    // Spy on jsdom's native clipboard implementation
    const writeText = jest
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith("print('hello')");
  });
});

describe("InspectorSidebar – explain script", () => {
  it("shows Explain Script button when script is present", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByRole("button", { name: /explain script/i })).toBeInTheDocument();
  });

  it("Explain Script button is disabled when script is blank whitespace", async () => {
    const user = userEvent.setup();
    render(
      <InspectorSidebar
        {...defaultProps}
        sidebar={{ ...mockSidebar, state: { ...mockSidebar.state, S: "   " } }}
      />,
    );
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByRole("button", { name: /explain script/i })).toBeDisabled();
  });

  it("clicking Explain Script calls explainScript with the chatId", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /explain script/i }));
    await screen.findByText("This script computes results.");
    expect(mockExplainScript).toHaveBeenCalledWith("chat-1");
  });

  it("shows the explanation text after a successful call", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /explain script/i }));
    expect(await screen.findByText("This script computes results.")).toBeInTheDocument();
  });

  it("shows 'Explaining...' while the call is in flight", async () => {
    let resolve!: (v: { description: string }) => void;
    mockExplainScript.mockReturnValue(
      new Promise((res) => { resolve = res; }),
    );
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /explain script/i }));
    expect(screen.getByRole("button", { name: /explaining\.\.\./i })).toBeDisabled();
    resolve({ description: "done" });
    await screen.findByText("done");
  });

  it("shows a cached description from sidebar state without clicking Explain", async () => {
    const user = userEvent.setup();
    render(
      <InspectorSidebar
        {...defaultProps}
        sidebar={{
          ...mockSidebar,
          state: { ...mockSidebar.state, s_description: "Pre-loaded explanation." },
        }}
      />,
    );
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByText("Pre-loaded explanation.")).toBeInTheDocument();
    expect(mockExplainScript).not.toHaveBeenCalled();
    // Button label changes to "Hide Explanation" once an explanation is available
    expect(screen.getByRole("button", { name: /hide explanation/i })).toBeInTheDocument();
  });

  it("changes button label to 'Hide Explanation' after fetching", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /explain script/i }));
    await screen.findByText("This script computes results.");
    expect(screen.getByRole("button", { name: /hide explanation/i })).toBeInTheDocument();
  });

  it("clicking 'Hide Explanation' hides the explanation box", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /explain script/i }));
    await screen.findByText("This script computes results.");
    await user.click(screen.getByRole("button", { name: /hide explanation/i }));
    expect(screen.queryByText("This script computes results.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show explanation/i })).toBeInTheDocument();
  });

  it("clicking 'Show Explanation' reveals the explanation box again", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /explain script/i }));
    await screen.findByText("This script computes results.");
    await user.click(screen.getByRole("button", { name: /hide explanation/i }));
    await user.click(screen.getByRole("button", { name: /show explanation/i }));
    expect(screen.getByText("This script computes results.")).toBeInTheDocument();
  });
});
