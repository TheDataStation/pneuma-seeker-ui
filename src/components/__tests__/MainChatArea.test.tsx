import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainChatArea } from "@/components/MainChatArea";
import type { ChatMessage } from "@/lib/types";

// ---------------------------------------------------------------------------
// ResizeObserver mock — jsdom has no layout engine, so ResizeObserver isn't
// implemented. This mock captures the callback per instance so tests can
// trigger it manually to simulate a content resize (e.g. the thinking-process
// collapse transition), and tracks disconnect/observe calls for lifecycle
// assertions.
// ---------------------------------------------------------------------------
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observedElements: Element[] = [];
  disconnected = false;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observedElements.push(el);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function mockScrollMetrics(
  el: HTMLElement,
  metrics: { scrollTop: number; scrollHeight: number; clientHeight: number },
) {
  Object.defineProperty(el, "scrollTop", {
    value: metrics.scrollTop,
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
  MockResizeObserver.instances = [];
  (global as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
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

// ---------------------------------------------------------------------------
// Auto-scroll (ResizeObserver-driven "stick to bottom")
// ---------------------------------------------------------------------------
//
// Regression coverage: after a long streamed "thinking" phase collapses into
// a short final answer, the container used to get stuck out of view until
// the user manually scrolled. A `setTimeout(..., 550)` guess was replaced
// with a ResizeObserver watching the message content wrapper, so the
// viewport continuously tracks every intermediate frame of that collapse
// (and any other content-height change), not just messages-array updates.
describe("MainChatArea – auto-scroll via ResizeObserver", () => {
  it("observes the message content node on mount", () => {
    render(<MainChatArea {...defaultProps} />);
    expect(MockResizeObserver.instances.length).toBeGreaterThan(0);
    const instance = MockResizeObserver.instances[0];
    expect(instance.observedElements.length).toBe(1);
  });

  it("scrolls to bottom instantly when observed content resizes while pinned to bottom", () => {
    render(<MainChatArea {...defaultProps} />);
    const instance = MockResizeObserver.instances[0];

    (Element.prototype.scrollTo as jest.Mock).mockClear();
    instance.trigger();

    expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
      top: expect.any(Number),
      behavior: "auto",
    });
  });

  it("does not scroll on resize once the user has scrolled away from the bottom", () => {
    render(<MainChatArea {...defaultProps} />);
    const container = screen.getByTestId("chat-scroll-container");

    // Simulate the user scrolling far away from the bottom (well past the
    // 80px "near bottom" threshold used by handleScroll).
    mockScrollMetrics(container, {
      scrollTop: 0,
      scrollHeight: 2000,
      clientHeight: 400,
    });
    fireEvent.scroll(container);

    const instance = MockResizeObserver.instances[0];
    (Element.prototype.scrollTo as jest.Mock).mockClear();
    instance.trigger();

    expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
  });

  it("resumes auto-scroll on resize once the user scrolls back near the bottom", () => {
    render(<MainChatArea {...defaultProps} />);
    const container = screen.getByTestId("chat-scroll-container");

    mockScrollMetrics(container, {
      scrollTop: 0,
      scrollHeight: 2000,
      clientHeight: 400,
    });
    fireEvent.scroll(container);

    // Now scroll back within the 80px "near bottom" threshold.
    mockScrollMetrics(container, {
      scrollTop: 1550,
      scrollHeight: 2000,
      clientHeight: 400,
    });
    fireEvent.scroll(container);

    const instance = MockResizeObserver.instances[0];
    (Element.prototype.scrollTo as jest.Mock).mockClear();
    instance.trigger();

    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });

  it("re-observes a fresh content node when chatKey changes", () => {
    const { rerender } = render(
      <MainChatArea {...defaultProps} chatKey="chat-1" />,
    );
    const countAfterFirstMount = MockResizeObserver.instances.length;

    rerender(<MainChatArea {...defaultProps} chatKey="chat-2" />);

    expect(MockResizeObserver.instances.length).toBeGreaterThan(
      countAfterFirstMount,
    );
    const latest =
      MockResizeObserver.instances[MockResizeObserver.instances.length - 1];
    expect(latest.observedElements.length).toBe(1);
  });

  it("disconnects the observer for the old chat when chatKey changes", () => {
    const { rerender } = render(
      <MainChatArea {...defaultProps} chatKey="chat-1" />,
    );
    const firstInstance = MockResizeObserver.instances[0];

    rerender(<MainChatArea {...defaultProps} chatKey="chat-2" />);

    expect(firstInstance.disconnected).toBe(true);
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<MainChatArea {...defaultProps} />);
    const instance = MockResizeObserver.instances[0];
    unmount();
    expect(instance.disconnected).toBe(true);
  });

  it("does not throw when ResizeObserver is unavailable in the environment", () => {
    const original = (global as unknown as { ResizeObserver?: unknown })
      .ResizeObserver;
    delete (global as unknown as { ResizeObserver?: unknown }).ResizeObserver;

    expect(() => render(<MainChatArea {...defaultProps} />)).not.toThrow();

    (global as unknown as { ResizeObserver?: unknown }).ResizeObserver =
      original;
  });
});
