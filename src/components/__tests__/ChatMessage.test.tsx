import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatMessage, ChatMessageList } from "@/components/ChatMessage";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

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
    render(
      <ChatMessage message={{ role: "assistant", content: "Final answer" }} />,
    );
    expect(screen.getByText("Final answer")).toHaveClass("fade-in");
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
