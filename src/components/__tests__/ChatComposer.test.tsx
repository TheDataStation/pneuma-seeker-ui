import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatComposer } from "@/components/ChatComposer";

const defaultProps = {
  isSending: false,
  onSend: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("ChatComposer – rendering", () => {
  it("renders a textarea", () => {
    render(<ChatComposer {...defaultProps} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders the send button", () => {
    render(<ChatComposer {...defaultProps} />);
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("send button is disabled when textarea is empty", () => {
    render(<ChatComposer {...defaultProps} />);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("send button is disabled when isSending=true", async () => {
    const user = userEvent.setup();
    render(<ChatComposer {...defaultProps} isSending={true} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");
    expect(screen.getByRole("button", { name: /thinking/i })).toBeDisabled();
  });

  it("send button aria-label is 'Thinking' when isSending=true", () => {
    render(<ChatComposer {...defaultProps} isSending={true} />);
    expect(
      screen.getByRole("button", { name: /thinking/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

describe("ChatComposer – sending", () => {
  it("enables send button when textarea has text", async () => {
    const user = userEvent.setup();
    render(<ChatComposer {...defaultProps} />);
    await user.type(screen.getByRole("textbox"), "hello");
    expect(screen.getByRole("button", { name: /send/i })).not.toBeDisabled();
  });

  it("calls onSend with trimmed content when button is clicked", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatComposer {...defaultProps} onSend={onSend} />);
    await user.type(screen.getByRole("textbox"), "  hello  ");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    render(<ChatComposer {...defaultProps} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(textarea).toHaveValue("");
  });

  it("calls onSend when Enter is pressed (without Shift)", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatComposer {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("does NOT call onSend when Shift+Enter is pressed", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatComposer {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not call onSend when textarea is whitespace-only", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatComposer {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "   ");
    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not call onSend when isSending=true and Enter is pressed", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatComposer {...defaultProps} isSending={true} onSend={onSend} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");
    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Plan mode toggle
// ---------------------------------------------------------------------------

describe("ChatComposer – plan mode toggle", () => {
  it("does not render the toggle when onTogglePlanMode is not provided", () => {
    render(<ChatComposer {...defaultProps} />);
    expect(
      screen.queryByRole("button", { name: /plan mode/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the toggle when onTogglePlanMode is provided", () => {
    render(<ChatComposer {...defaultProps} onTogglePlanMode={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: /plan mode/i }),
    ).toBeInTheDocument();
  });

  it("reflects planMode=false via aria-pressed", () => {
    render(
      <ChatComposer
        {...defaultProps}
        planMode={false}
        onTogglePlanMode={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /plan mode/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reflects planMode=true via aria-pressed", () => {
    render(
      <ChatComposer
        {...defaultProps}
        planMode={true}
        onTogglePlanMode={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /plan mode/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("calls onTogglePlanMode when clicked", async () => {
    const onTogglePlanMode = jest.fn();
    const user = userEvent.setup();
    render(
      <ChatComposer {...defaultProps} onTogglePlanMode={onTogglePlanMode} />,
    );
    await user.click(screen.getByRole("button", { name: /plan mode/i }));
    expect(onTogglePlanMode).toHaveBeenCalledTimes(1);
  });
});
