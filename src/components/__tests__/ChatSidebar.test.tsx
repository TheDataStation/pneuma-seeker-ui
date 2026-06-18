import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "@/components/ChatSidebar";
import type { ChatSession } from "@/lib/types";

const sessions: ChatSession[] = [
  { id: "1", title: "First Chat", lastActive: new Date().toISOString() },
  { id: "2", title: "Second Chat", lastActive: new Date().toISOString() },
];

const defaultProps = {
  chatSessions: sessions,
  activeChatId: "",
  setActiveChatId: jest.fn(),
  isOpen: true,
  onDeleteChat: jest.fn(),
  onSearch: jest.fn(),
  hasMore: false,
  onLoadMore: jest.fn(),
  isLoading: false,
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Mobile overlay positioning
// ---------------------------------------------------------------------------

describe("ChatSidebar – mobile overlay", () => {
  it("renders the aside with fixed positioning class (mobile overlay)", () => {
    const { container } = render(<ChatSidebar {...defaultProps} />);
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("fixed");
  });

  it("applies translate-x-0 (visible) when open", () => {
    const { container } = render(
      <ChatSidebar {...defaultProps} isOpen={true} />,
    );
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("translate-x-0");
  });

  it("applies -translate-x-full (off-screen) when closed", () => {
    const { container } = render(
      <ChatSidebar {...defaultProps} isOpen={false} />,
    );
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("-translate-x-full");
  });

  it("renders the mobile close button when open", () => {
    render(<ChatSidebar {...defaultProps} isOpen={true} />);
    expect(
      screen.getByRole("button", { name: /close sidebar/i }),
    ).toBeInTheDocument();
  });

  it("calls onClose when the mobile close button is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<ChatSidebar {...defaultProps} isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /close sidebar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// onClose called on chat selection
// ---------------------------------------------------------------------------

describe("ChatSidebar – onClose on chat select", () => {
  it("calls onClose when a chat item is clicked", async () => {
    const onClose = jest.fn();
    const setActiveChatId = jest.fn();
    const user = userEvent.setup();
    render(
      <ChatSidebar
        {...defaultProps}
        onClose={onClose}
        setActiveChatId={setActiveChatId}
      />,
    );
    await user.click(screen.getByText("First Chat"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls setActiveChatId with the correct id when a chat item is clicked", async () => {
    const setActiveChatId = jest.fn();
    const user = userEvent.setup();
    render(<ChatSidebar {...defaultProps} setActiveChatId={setActiveChatId} />);
    await user.click(screen.getByText("Second Chat"));
    expect(setActiveChatId).toHaveBeenCalledWith("2");
  });

  it("calls onClose when Enter key is pressed on a chat item", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<ChatSidebar {...defaultProps} onClose={onClose} />);
    const firstChat = screen
      .getByText("First Chat")
      .closest("[role='button']")!;
    firstChat.focus();
    await user.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Core rendering
// ---------------------------------------------------------------------------

describe("ChatSidebar – core rendering", () => {
  it("renders all chat sessions", () => {
    render(<ChatSidebar {...defaultProps} />);
    expect(screen.getByText("First Chat")).toBeInTheDocument();
    expect(screen.getByText("Second Chat")).toBeInTheDocument();
  });

  it("shows empty state when there are no chats", () => {
    render(<ChatSidebar {...defaultProps} chatSessions={[]} />);
    expect(screen.getByText("No chats yet.")).toBeInTheDocument();
  });

  it("shows loading state when isLoading=true and no sessions yet", () => {
    render(
      <ChatSidebar {...defaultProps} chatSessions={[]} isLoading={true} />,
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders a Load more button when hasMore=true", () => {
    render(<ChatSidebar {...defaultProps} hasMore={true} />);
    expect(
      screen.getByRole("button", { name: /load more/i }),
    ).toBeInTheDocument();
  });

  it("calls onLoadMore when Load more is clicked", async () => {
    const onLoadMore = jest.fn();
    const user = userEvent.setup();
    render(
      <ChatSidebar {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />,
    );
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Active chat styling
// ---------------------------------------------------------------------------

describe("ChatSidebar – active chat highlight", () => {
  it("applies active border class to the active chat item", () => {
    render(<ChatSidebar {...defaultProps} activeChatId="1" />);
    const activeItem = screen
      .getByText("First Chat")
      .closest("[role='button']")!;
    expect(activeItem.className).toContain("border-ember/40");
  });

  it("does not apply active class to an inactive chat item", () => {
    render(<ChatSidebar {...defaultProps} activeChatId="1" />);
    const inactiveItem = screen
      .getByText("Second Chat")
      .closest("[role='button']")!;
    expect(inactiveItem.className).not.toContain("border-ember/40");
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe("ChatSidebar – search", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("renders the search input", () => {
    render(<ChatSidebar {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search chats…")).toBeInTheDocument();
  });

  it("calls onSearch with the typed query after debounce", async () => {
    const onSearch = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ChatSidebar {...defaultProps} onSearch={onSearch} />);

    await user.type(screen.getByPlaceholderText("Search chats…"), "hello");
    expect(onSearch).not.toHaveBeenCalled();

    jest.runAllTimers();
    expect(onSearch).toHaveBeenCalledWith("hello");
  });

  it("shows the clear button when search has text", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ChatSidebar {...defaultProps} />);
    await user.type(screen.getByPlaceholderText("Search chats…"), "x");
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
  });

  it("clears the input and calls onSearch('') when clear button is clicked", async () => {
    const onSearch = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ChatSidebar {...defaultProps} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText("Search chats…");
    await user.type(input, "test");
    jest.runAllTimers();

    await user.click(screen.getByLabelText("Clear search"));
    expect(input).toHaveValue("");
    expect(onSearch).toHaveBeenLastCalledWith("");
  });

  it("shows 'No chats match your search.' when search active and no sessions", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ChatSidebar {...defaultProps} chatSessions={[]} />);
    await user.type(screen.getByPlaceholderText("Search chats…"), "xyz");
    jest.runAllTimers();
    expect(screen.getByText("No chats match your search.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Delete chat
// ---------------------------------------------------------------------------

describe("ChatSidebar – delete chat", () => {
  it("calls onDeleteChat when delete is confirmed", async () => {
    const onDeleteChat = jest.fn();
    const user = userEvent.setup();
    window.confirm = jest.fn(() => true);
    render(<ChatSidebar {...defaultProps} onDeleteChat={onDeleteChat} />);

    const deleteButtons = screen.getAllByTitle("Delete chat");
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDeleteChat).toHaveBeenCalledWith("1");
  });

  it("does not call onDeleteChat when delete is cancelled", async () => {
    const onDeleteChat = jest.fn();
    const user = userEvent.setup();
    window.confirm = jest.fn(() => false);
    render(<ChatSidebar {...defaultProps} onDeleteChat={onDeleteChat} />);

    const deleteButtons = screen.getAllByTitle("Delete chat");
    await user.click(deleteButtons[0]);

    expect(onDeleteChat).not.toHaveBeenCalled();
  });
});
