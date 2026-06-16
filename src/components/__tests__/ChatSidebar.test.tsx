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
    const { container } = render(<ChatSidebar {...defaultProps} isOpen={true} />);
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("translate-x-0");
  });

  it("applies -translate-x-full (off-screen) when closed", () => {
    const { container } = render(<ChatSidebar {...defaultProps} isOpen={false} />);
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("-translate-x-full");
  });

  it("renders the mobile close button when open", () => {
    render(<ChatSidebar {...defaultProps} isOpen={true} />);
    expect(screen.getByRole("button", { name: /close sidebar/i })).toBeInTheDocument();
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
    render(
      <ChatSidebar {...defaultProps} setActiveChatId={setActiveChatId} />,
    );

    await user.click(screen.getByText("Second Chat"));

    expect(setActiveChatId).toHaveBeenCalledWith("2");
  });

  it("calls onClose when Enter key is pressed on a chat item", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<ChatSidebar {...defaultProps} onClose={onClose} />);

    const firstChat = screen.getByText("First Chat").closest("[role='button']")!;
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
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("calls onLoadMore when Load more is clicked", async () => {
    const onLoadMore = jest.fn();
    const user = userEvent.setup();
    render(<ChatSidebar {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />);

    await user.click(screen.getByRole("button", { name: /load more/i }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
