import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../lib/api/chat", () => ({
  explainScript: jest.fn(),
}));

// Spy on the real renderMarkdown (not a stub) so content-rendering
// assertions elsewhere in this file are unaffected — used by the
// memoization describe block to count how many times the markdown
// pipeline actually runs.
jest.mock("../../lib/markdown", () => {
  const actual = jest.requireActual("../../lib/markdown");
  return { renderMarkdown: jest.fn(actual.renderMarkdown) };
});

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
import { renderMarkdown } from "../../lib/markdown";
import type { ChatStateResponse, TableRow } from "@/lib/types";

const mockExplainScript = explainScript as jest.Mock;
const mockRenderMarkdown = renderMarkdown as jest.Mock;

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

// Regression: ChatApp renders <InspectorSidebar key={activeChatId} .../>.
// Without that key, switching chats reuses the same component instance, and
// local useState seeded from the sidebar prop (explanation, showExplanation,
// expandedSections, etc.) only reads its initial value on first mount — so
// a previous chat's cached script explanation kept showing for a completely
// different chat. These tests simulate exactly what changing `key` does
// (React unmounts the old instance and mounts a fresh one) via RTL's
// `rerender` with a different `key` prop between renders.
describe("InspectorSidebar – state does not leak across chats (remount via key)", () => {
  it("does not show the previous chat's cached explanation after switching chats", async () => {
    const user = userEvent.setup();
    const sidebarA: ChatStateResponse = {
      ...mockSidebar,
      state: { ...mockSidebar.state, s_description: "Chat A's explanation." },
    };
    const sidebarB: ChatStateResponse = {
      ...mockSidebar,
      state: { ...mockSidebar.state, s_description: undefined },
    };

    const { rerender } = render(
      <InspectorSidebar
        key="chat-a"
        {...defaultProps}
        activeChatId="chat-a"
        sidebar={sidebarA}
      />,
    );
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByText("Chat A's explanation.")).toBeInTheDocument();

    rerender(
      <InspectorSidebar
        key="chat-b"
        {...defaultProps}
        activeChatId="chat-b"
        sidebar={sidebarB}
      />,
    );

    expect(
      screen.queryByText("Chat A's explanation."),
    ).not.toBeInTheDocument();
  });

  it("resets expanded accordion sections after switching chats", async () => {
    const user = userEvent.setup();
    const sidebarA: ChatStateResponse = { ...mockSidebar };
    const sidebarB: ChatStateResponse = { ...mockSidebar };

    const { rerender } = render(
      <InspectorSidebar
        key="chat-a"
        {...defaultProps}
        activeChatId="chat-a"
        sidebar={sidebarA}
      />,
    );
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByText("print('hello')")).toBeInTheDocument();

    rerender(
      <InspectorSidebar
        key="chat-b"
        {...defaultProps}
        activeChatId="chat-b"
        sidebar={sidebarB}
      />,
    );

    expect(screen.queryByText("print('hello')")).not.toBeInTheDocument();
  });
});

describe("InspectorSidebar – step hints", () => {
  it("shows a help ('?') button for each step", () => {
    render(<InspectorSidebar {...defaultProps} />);
    expect(
      screen.getAllByRole("button", { name: /what does this step do/i }),
    ).toHaveLength(3);
  });

  it("shows the Retrieve Tables hint on hover", () => {
    render(<InspectorSidebar {...defaultProps} />);
    const buttons = screen.getAllByRole("button", {
      name: /what does this step do/i,
    });
    fireEvent.mouseEnter(buttons[0]);
    expect(
      screen.getByText(/searches your dataset/i),
    ).toBeInTheDocument();
  });

  it("shows the Materialize Views hint on hover", () => {
    render(<InspectorSidebar {...defaultProps} />);
    const buttons = screen.getAllByRole("button", {
      name: /what does this step do/i,
    });
    fireEvent.mouseEnter(buttons[1]);
    expect(screen.getByText(/builds views/i)).toBeInTheDocument();
  });

  it("shows the Execute Script hint on hover", () => {
    render(<InspectorSidebar {...defaultProps} />);
    const buttons = screen.getAllByRole("button", {
      name: /what does this step do/i,
    });
    fireEvent.mouseEnter(buttons[2]);
    expect(
      screen.getByText(/runs the generated analysis script/i),
    ).toBeInTheDocument();
  });

  // Regression guard: the help button lives inside the same header row that
  // toggles the accordion section open/closed on click.
  it("clicking the help button does not expand or collapse the step section", async () => {
    const user = userEvent.setup();
    render(<InspectorSidebar {...defaultProps} />);
    const buttons = screen.getAllByRole("button", {
      name: /what does this step do/i,
    });
    await user.click(buttons[2]); // Execute Script's help button
    expect(screen.queryByText("print('hello')")).not.toBeInTheDocument();
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

// ---------------------------------------------------------------------------
// renderMarkdown memoization
// ---------------------------------------------------------------------------
//
// Regression: both the provenance-step and script-explanation markdown
// blocks called renderMarkdown() inline in JSX with no memoization, so any
// re-render from unrelated sibling state re-ran the full marked+DOMPurify
// pipeline on unchanged text.
describe("InspectorSidebar – renderMarkdown memoization", () => {
  it("does not re-run renderMarkdown for the provenance step when an unrelated prop changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Materialize Views"));
    await user.click(
      screen.getByRole("button", { name: /show preparation steps/i }),
    );

    const callsAfterShow = mockRenderMarkdown.mock.calls.length;
    expect(callsAfterShow).toBeGreaterThan(0);

    rerender(
      <InspectorSidebar
        {...defaultProps}
        executionResult={[{ x: 1 }] as TableRow[]}
      />,
    );

    expect(mockRenderMarkdown).toHaveBeenCalledTimes(callsAfterShow);
  });

  it("does not re-run renderMarkdown for the script explanation when an unrelated prop changes", async () => {
    const user = userEvent.setup();
    const sidebarWithDescription: ChatStateResponse = {
      ...mockSidebar,
      state: { ...mockSidebar.state, s_description: "Cached explanation." },
    };
    const { rerender } = render(
      <InspectorSidebar {...defaultProps} sidebar={sidebarWithDescription} />,
    );
    await user.click(screen.getByText("Execute Script"));
    expect(screen.getByText("Cached explanation.")).toBeInTheDocument();

    const callsAfterShow = mockRenderMarkdown.mock.calls.length;
    expect(callsAfterShow).toBeGreaterThan(0);

    rerender(
      <InspectorSidebar
        {...defaultProps}
        sidebar={sidebarWithDescription}
        executionResult={[{ x: 1 }] as TableRow[]}
      />,
    );

    expect(mockRenderMarkdown).toHaveBeenCalledTimes(callsAfterShow);
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

  // Regression: explainScript's LLM-generated response used to render as
  // plain text, so markdown syntax like **bold** showed up as literal
  // asterisks instead of being formatted.
  it("renders markdown in the explanation text", async () => {
    mockExplainScript.mockResolvedValue({
      description: "This script **filters** rows by `status`.",
    });
    const user = userEvent.setup();
    const { container } = render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /explain script/i }));
    await screen.findByText(/filters/);
    expect(container.querySelector("strong")).toHaveTextContent("filters");
    expect(container.querySelector("code")).toHaveTextContent("status");
  });

  it("sanitizes malicious HTML in the explanation text", async () => {
    mockExplainScript.mockResolvedValue({
      description: 'safe text <script>alert(1)</script><img src=x onerror=alert(1)>',
    });
    const user = userEvent.setup();
    const { container } = render(<InspectorSidebar {...defaultProps} />);
    await user.click(screen.getByText("Execute Script"));
    await user.click(screen.getByRole("button", { name: /explain script/i }));
    await screen.findByText(/safe text/);
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("onerror");
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
