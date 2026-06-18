import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainChatArea } from "@/components/MainChatArea";
import type { ChatMessage } from "@/lib/types";

const messages: ChatMessage[] = [
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hi there" },
];

const defaultProps = {
  messages,
  isStreaming: false,
  isHistoryLoading: false,
  onSend: jest.fn(),
  chatKey: "chat-1",
};

beforeEach(() => {
  jest.clearAllMocks();
  // jsdom doesn't implement scrollTo on elements
  Element.prototype.scrollTo = jest.fn();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("MainChatArea – rendering", () => {
  it("renders the chat message list when not loading history", () => {
    render(<MainChatArea {...defaultProps} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there")).toBeInTheDocument();
  });

  it("shows the history loading skeleton when isHistoryLoading=true", () => {
    const { container } = render(
      <MainChatArea {...defaultProps} isHistoryLoading={true} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("hides the chat messages when isHistoryLoading=true", () => {
    render(<MainChatArea {...defaultProps} isHistoryLoading={true} />);
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("renders the ChatComposer textarea", () => {
    render(<MainChatArea {...defaultProps} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

describe("MainChatArea – sending", () => {
  it("passes typed message to onSend when Enter is pressed", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<MainChatArea {...defaultProps} onSend={onSend} />);
    await user.type(screen.getByRole("textbox"), "New message");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("New message");
  });

  it("disables send when isStreaming=true", () => {
    render(<MainChatArea {...defaultProps} isStreaming={true} />);
    expect(screen.getByRole("button", { name: /thinking/i })).toBeDisabled();
  });
});
