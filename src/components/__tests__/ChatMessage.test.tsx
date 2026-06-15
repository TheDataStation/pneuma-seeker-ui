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
      />
    );
    expect(screen.queryByText(/Thinking Process/i)).not.toBeInTheDocument();
  });
});

describe("ChatMessage – assistant bubble", () => {
  it("renders message content", () => {
    render(<ChatMessage message={{ role: "assistant", content: "Hi there" }} />);
    expect(screen.getByText("Hi there")).toBeInTheDocument();
  });

  it("shows bounce indicator when content is empty (mid-stream)", () => {
    const { container } = render(
      <ChatMessage message={{ role: "assistant", content: "" }} />
    );
    expect(container.querySelector(".animate-bounce")).toBeInTheDocument();
  });

  it("does not show bounce indicator when content is present", () => {
    const { container } = render(
      <ChatMessage message={{ role: "assistant", content: "Done" }} />
    );
    expect(container.querySelector(".animate-bounce")).not.toBeInTheDocument();
  });
});

describe("ChatMessage – Thinking Process", () => {
  const message: ChatMessageType = {
    role: "assistant",
    content: "Final answer",
    thoughts: ["Step 1", "Step 2"],
  };

  it("renders thoughts when provided", () => {
    render(<ChatMessage message={message} />);
    expect(screen.getByText(/Thinking Process \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();
  });

  it("is expanded by default", () => {
    render(<ChatMessage message={message} />);
    expect(screen.getByText(/Step 1/)).toBeVisible();
  });

  it("collapses thoughts on toggle click", async () => {
    const user = userEvent.setup();
    render(<ChatMessage message={message} />);

    await user.click(screen.getByRole("button", { name: /Thinking Process/i }));
    expect(screen.queryByText(/Step 1/)).not.toBeInTheDocument();
  });

  it("re-expands thoughts on second toggle click", async () => {
    const user = userEvent.setup();
    render(<ChatMessage message={message} />);
    const btn = screen.getByRole("button", { name: /Thinking Process/i });

    await user.click(btn);
    await user.click(btn);
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
  });

  it("pulses the last log line when isLatestAssistant is true", () => {
    const { container } = render(
      <ChatMessage message={message} isLatestAssistant={true} />
    );
    const lastThought = container.querySelectorAll(".animate-pulse");
    expect(lastThought.length).toBeGreaterThan(0);
  });

  it("does not pulse when isLatestAssistant is false", () => {
    const { container } = render(
      <ChatMessage message={message} isLatestAssistant={false} />
    );
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("renders nothing when thoughts array is empty", () => {
    render(
      <ChatMessage message={{ role: "assistant", content: "Done", thoughts: [] }} />
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
    // The last assistant gets .animate-pulse on its last thought; earlier ones do not.
    const messages: ChatMessageType[] = [
      { role: "assistant", content: "First", thoughts: ["t1"] },
      { role: "assistant", content: "Second", thoughts: ["t2"] },
    ];
    const { container } = render(<ChatMessageList messages={messages} />);
    // Only the second assistant bubble should pulse its last thought
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
