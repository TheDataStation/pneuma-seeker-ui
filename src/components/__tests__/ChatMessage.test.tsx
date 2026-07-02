import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatMessage, ChatMessageList } from "@/components/ChatMessage";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

// Spy on the real renderMarkdown (not a stub) so existing content-rendering
// assertions below are unaffected — only used by the memoization describe
// block to count how many times the markdown pipeline actually runs.
jest.mock("../../lib/markdown", () => {
  const actual = jest.requireActual("../../lib/markdown");
  return { renderMarkdown: jest.fn(actual.renderMarkdown) };
});
import { renderMarkdown } from "@/lib/markdown";
const mockRenderMarkdown = renderMarkdown as jest.Mock;

beforeEach(() => {
  mockRenderMarkdown.mockClear();
});

// ---------------------------------------------------------------------------
// ChatMessage
// ---------------------------------------------------------------------------

describe("ChatMessage – user bubble", () => {
  it("renders message content", () => {
    render(<ChatMessage message={{ role: "user", content: "Hello" }} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("does not render a Thinking Process section", () => {
    render(
      <ChatMessage
        message={{ role: "user", content: "Hi", thoughts: ["ignore me"] }}
      />,
    );
    expect(screen.queryByText(/Thinking Process/i)).not.toBeInTheDocument();
  });

  // Regression guard: only assistant/system output is markdown-rendered.
  // User-typed text must always show up verbatim, not be reinterpreted.
  it("does not render markdown syntax in user messages", () => {
    const { container } = render(
      <ChatMessage message={{ role: "user", content: "**not bold**" }} />,
    );
    expect(screen.getByText("**not bold**")).toBeInTheDocument();
    expect(container.querySelector("strong")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Markdown rendering (assistant/system messages only)
// ---------------------------------------------------------------------------

describe("ChatMessage – markdown rendering", () => {
  it("renders **bold** markdown as a <strong> element", () => {
    const { container } = render(
      <ChatMessage message={{ role: "assistant", content: "**important**" }} />,
    );
    const strong = container.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveTextContent("important");
  });

  it("renders markdown links with safe target/rel attributes", () => {
    const { container } = render(
      <ChatMessage
        message={{
          role: "assistant",
          content: "[docs](https://example.com)",
        }}
      />,
    );
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("sanitizes malicious HTML embedded in assistant content", () => {
    const { container } = render(
      <ChatMessage
        message={{
          role: "assistant",
          content: "before <script>alert(1)</script> after",
        }}
      />,
    );
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("alert(1)");
    expect(screen.getByText(/before/)).toBeInTheDocument();
  });

  it("sanitizes an event-handler-attribute XSS payload", () => {
    const { container } = render(
      <ChatMessage
        message={{
          role: "assistant",
          content: '<img src="x" onerror="alert(1)">',
        }}
      />,
    );
    expect(container.innerHTML).not.toContain("onerror");
  });

  it("renders markdown for system-role messages too", () => {
    const { container } = render(
      <ChatMessage message={{ role: "system", content: "**note**" }} />,
    );
    expect(container.querySelector("strong")).toBeInTheDocument();
  });
});

describe("ChatMessage – assistant bubble", () => {
  it("renders message content", () => {
    render(
      <ChatMessage message={{ role: "assistant", content: "Hi there" }} />,
    );
    expect(screen.getByText("Hi there")).toBeInTheDocument();
  });

  it("shows bounce indicator when content is empty (mid-stream)", () => {
    const { container } = render(
      <ChatMessage message={{ role: "assistant", content: "" }} />,
    );
    expect(container.querySelector(".animate-bounce")).toBeInTheDocument();
  });

  it("does not show bounce indicator when content is present", () => {
    const { container } = render(
      <ChatMessage message={{ role: "assistant", content: "Done" }} />,
    );
    expect(container.querySelector(".animate-bounce")).not.toBeInTheDocument();
  });

  // Regression: the final answer used to pop in abruptly at the exact instant
  // the thinking process started its 500ms collapse transition, making the
  // handoff feel jarring. A fade-in softens that switch.
  it("fades in the final answer instead of popping in abruptly", () => {
    const { container } = render(
      <ChatMessage message={{ role: "assistant", content: "Final answer" }} />,
    );
    expect(screen.getByText("Final answer")).toBeInTheDocument();
    expect(container.querySelector(".markdown-content")).toHaveClass(
      "fade-in",
    );
  });
});

describe("ChatMessage – Thinking Process", () => {
  // Thoughts are only visible while content is still empty (streaming phase)
  const streamingMessage: ChatMessageType = {
    role: "assistant",
    content: "",
    thoughts: ["Step 1", "Step 2"],
  };

  it("renders thoughts while final answer is pending (content empty)", () => {
    render(<ChatMessage message={streamingMessage} />);
    expect(screen.getByText(/Thinking Process \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();
  });

  it("collapses thoughts via CSS transition once final answer arrives", () => {
    render(
      <ChatMessage
        message={{ role: "assistant", content: "Final answer", thoughts: ["Step 1"] }}
      />,
    );
    // Element stays in DOM for the fade animation; CSS classes drive the collapse
    const wrapper = screen.getByTestId("thoughts-wrapper");
    expect(wrapper).toHaveClass("opacity-0");
    expect(wrapper).toHaveClass("max-h-0");
    expect(screen.getByText("Final answer")).toBeInTheDocument();
  });

  it("is expanded by default", () => {
    render(<ChatMessage message={streamingMessage} />);
    expect(screen.getByText(/Step 1/)).toBeVisible();
  });

  it("collapses thoughts on toggle click", async () => {
    const user = userEvent.setup();
    render(<ChatMessage message={streamingMessage} />);

    await user.click(screen.getByRole("button", { name: /Thinking Process/i }));
    expect(screen.queryByText(/Step 1/)).not.toBeInTheDocument();
  });

  it("re-expands thoughts on second toggle click", async () => {
    const user = userEvent.setup();
    render(<ChatMessage message={streamingMessage} />);
    const btn = screen.getByRole("button", { name: /Thinking Process/i });

    await user.click(btn);
    await user.click(btn);
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
  });

  it("pulses the last log line when isLatestAssistant is true", () => {
    const { container } = render(
      <ChatMessage message={streamingMessage} isLatestAssistant={true} />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("does not pulse when isLatestAssistant is false", () => {
    const { container } = render(
      <ChatMessage message={streamingMessage} isLatestAssistant={false} />,
    );
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("renders nothing when thoughts array is empty", () => {
    render(
      <ChatMessage message={{ role: "assistant", content: "", thoughts: [] }} />,
    );
    expect(screen.queryByText(/Thinking Process/i)).not.toBeInTheDocument();
  });

  // Regression: very long thinking streams made the thoughts panel grow
  // unbounded, which (combined with the auto-scroll-tracking behavior in
  // MainChatArea) could leave the eventual final answer scrolled out of
  // view. The panel now caps its own height and scrolls internally instead
  // of growing the page indefinitely.
  it("caps the thoughts panel height and makes it independently scrollable", () => {
    render(<ChatMessage message={streamingMessage} />);
    const panel = screen.getByTestId("thinking-process-scroll");
    expect(panel).toHaveClass("max-h-[60vh]");
    expect(panel).toHaveClass("overflow-auto");
  });

  it("uses a wrapper cap that safely exceeds the inner panel's cap on any viewport", () => {
    render(<ChatMessage message={streamingMessage} />);
    const wrapper = screen.getByTestId("thoughts-wrapper");
    // max-h-screen (100vh) must stay >= the inner panel's max-h-[60vh] so
    // the wrapper never clips the (already scrollable) inner panel.
    expect(wrapper).toHaveClass("max-h-screen");
  });
});

describe("ChatMessage – Thinking Process auto-scroll", () => {
  function mockScrollMetrics(
    el: HTMLElement,
    metrics: { scrollTop: number; scrollHeight: number; clientHeight: number },
  ) {
    Object.defineProperty(el, "scrollTop", {
      value: metrics.scrollTop,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(el, "scrollHeight", {
      value: metrics.scrollHeight,
      configurable: true,
    });
    Object.defineProperty(el, "clientHeight", {
      value: metrics.clientHeight,
      configurable: true,
    });
  }

  it("scrolls its own panel to the latest thought as thoughts stream in", () => {
    const { rerender } = render(
      <ChatMessage
        message={{ role: "assistant", content: "", thoughts: ["Step 1"] }}
      />,
    );
    const panel = screen.getByTestId("thinking-process-scroll");
    mockScrollMetrics(panel, { scrollTop: 0, scrollHeight: 500, clientHeight: 100 });

    mockScrollMetrics(panel, { scrollTop: 0, scrollHeight: 900, clientHeight: 100 });
    rerender(
      <ChatMessage
        message={{ role: "assistant", content: "", thoughts: ["Step 1", "Step 2"] }}
      />,
    );

    // Instant (direct scrollTop assignment), so this should already reflect
    // the new bottom immediately after the update.
    expect(panel.scrollTop).toBe(900);
  });

  it("does not force-scroll the panel if the user has scrolled up within it", () => {
    const { rerender } = render(
      <ChatMessage
        message={{ role: "assistant", content: "", thoughts: ["Step 1"] }}
      />,
    );
    const panel = screen.getByTestId("thinking-process-scroll");
    // Simulate the user scrolling up inside the panel, away from the bottom.
    mockScrollMetrics(panel, { scrollTop: 0, scrollHeight: 900, clientHeight: 100 });
    fireEvent.scroll(panel);

    mockScrollMetrics(panel, { scrollTop: 0, scrollHeight: 1200, clientHeight: 100 });
    rerender(
      <ChatMessage
        message={{ role: "assistant", content: "", thoughts: ["Step 1", "Step 2"] }}
      />,
    );

    expect(panel.scrollTop).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ChatMessageList
// ---------------------------------------------------------------------------

describe("ChatMessageList", () => {
  it("renders an empty-state welcome message when messages is empty", () => {
    const { container } = render(<ChatMessageList messages={[]} />);
    // The empty-state renders a <p> with a welcome string; just confirm something rendered
    const p = container.querySelector("p");
    expect(p).toBeInTheDocument();
    expect(p?.textContent?.length).toBeGreaterThan(0);
  });

  it("renders all provided messages", () => {
    const messages: ChatMessageType[] = [
      { role: "user", content: "My question" },
      { role: "assistant", content: "My answer" },
    ];
    render(<ChatMessageList messages={messages} />);
    expect(screen.getByText("My question")).toBeInTheDocument();
    expect(screen.getByText("My answer")).toBeInTheDocument();
  });

  it("marks only the last assistant message as isLatestAssistant", () => {
    // Use empty content so thoughts are rendered (thoughts hide once final answer arrives)
    const messages: ChatMessageType[] = [
      { role: "assistant", content: "", thoughts: ["t1"] },
      { role: "assistant", content: "", thoughts: ["t2"] },
    ];
    const { container } = render(<ChatMessageList messages={messages} />);
    // Only the last bubble's thought should pulse
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(1);
  });

  // Regression: sparse message arrays used to crash with "undefined is not an object"
  it("does not crash when every message is a valid object", () => {
    const messages: ChatMessageType[] = [
      { role: "user", content: "ping" },
      { role: "assistant", content: "pong" },
    ];
    expect(() => render(<ChatMessageList messages={messages} />)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// renderMarkdown memoization
// ---------------------------------------------------------------------------
//
// Regression: renderMarkdown(message.content) used to run inline in JSX with
// no memoization. Since a streaming assistant message re-renders on every
// appended chunk (and also re-renders for unrelated reasons, e.g.
// isLatestAssistant flipping once a later message arrives), this meant the
// full marked+DOMPurify pipeline re-ran on the entire accumulated string on
// every single re-render, not just when content actually changed —
// quadratic work across a streamed response.
describe("ChatMessage – renderMarkdown memoization", () => {
  it("does not re-run renderMarkdown when an unrelated prop changes", () => {
    const message: ChatMessageType = { role: "assistant", content: "**bold**" };
    const { rerender } = render(
      <ChatMessage message={message} isLatestAssistant={true} />,
    );
    expect(mockRenderMarkdown).toHaveBeenCalledTimes(1);

    // Same message object/content, only isLatestAssistant changes.
    rerender(<ChatMessage message={message} isLatestAssistant={false} />);

    expect(mockRenderMarkdown).toHaveBeenCalledTimes(1);
  });

  it("re-runs renderMarkdown when content actually changes (streaming)", () => {
    const { rerender } = render(
      <ChatMessage message={{ role: "assistant", content: "Hello" }} />,
    );
    expect(mockRenderMarkdown).toHaveBeenCalledTimes(1);

    rerender(
      <ChatMessage message={{ role: "assistant", content: "Hello world" }} />,
    );

    expect(mockRenderMarkdown).toHaveBeenCalledTimes(2);
  });

  it("never calls renderMarkdown for user messages", () => {
    render(<ChatMessage message={{ role: "user", content: "**not markdown**" }} />);
    expect(mockRenderMarkdown).not.toHaveBeenCalled();
  });
});
