import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatApp } from "@/components/ChatApp";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = jest.fn();
const mockPush = jest.fn();
// Stable object reference across renders: ChatApp memoizes callbacks off
// `router` via useCallback, so a mock that returns a *new* object literal on
// every call (the previous version of this mock) breaks that memoization and
// causes an effect depending on the memoized callback to re-fire every
// render — an infinite loop once a test drives enough render cycles (e.g.
// typing into the composer) to expose it, rather than just rendering once.
const mockRouter = { replace: mockReplace, push: mockPush };

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("../../lib/api", () => ({
  getCurrentUser: jest.fn(),
  getAccessibleDatasets: jest.fn(),
  getAllChats: jest.fn(),
  getChatHistory: jest.fn(),
  getChatState: jest.fn(),
  streamChat: jest.fn(),
  deleteChat: jest.fn(),
  logout: jest.fn(),
  executeCode: jest.fn(),
  downloadTargetViews: jest.fn(),
  downloadE2EScript: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, msg: string) {
      super(msg);
      this.status = status;
    }
  },
}));

jest.mock("../../lib/utils", () => ({
  clearStoredToken: jest.fn(),
  generateUUID: jest.fn(() => "test-uuid"),
  saveBlob: jest.fn(),
  getRelativeTime: jest.fn(() => "just now"),
}));

import {
  getCurrentUser,
  getAccessibleDatasets,
  getAllChats,
  getChatState,
  getChatHistory,
  streamChat,
  ApiError,
} from "@/lib/api";

const mockGetCurrentUser = getCurrentUser as jest.Mock;
const mockGetAccessibleDatasets = getAccessibleDatasets as jest.Mock;
const mockGetAllChats = getAllChats as jest.Mock;
const mockGetChatState = getChatState as jest.Mock;
const mockGetChatHistory = getChatHistory as jest.Mock;
const mockStreamChat = streamChat as jest.Mock;

async function* toAsyncGenerator<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

const mockUser = {
  user_id: "u1",
  email: "user@example.com",
  username: "user",
  group_id: "g1",
  group_name: "users",
  is_active: true,
};

function setupAuthSuccess() {
  localStorage.setItem("token", "test-token");
  mockGetCurrentUser.mockResolvedValue(mockUser);
  mockGetAccessibleDatasets.mockResolvedValue({ datasets: ["db1"] });
  mockGetAllChats.mockResolvedValue({
    chats: [],
    has_more: false,
    next_offset: null,
  });
  mockGetChatState.mockRejectedValue(new Error("no chat"));
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  // jsdom doesn't implement scrollTo on elements
  Element.prototype.scrollTo = jest.fn();
});

// ---------------------------------------------------------------------------
// Auth bootstrap
// ---------------------------------------------------------------------------

describe("ChatApp – auth bootstrap", () => {
  it("redirects to login when no token is in localStorage", async () => {
    render(<ChatApp />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2F");
    });
  });

  it("shows loading screen while auth is being checked", () => {
    localStorage.setItem("token", "tok");
    mockGetCurrentUser.mockImplementation(() => new Promise(() => {})); // never resolves
    mockGetAccessibleDatasets.mockImplementation(() => new Promise(() => {}));

    render(<ChatApp />);
    expect(screen.getByText(/checking session/i)).toBeInTheDocument();
  });

  it("renders the full app after successful auth", async () => {
    setupAuthSuccess();
    render(<ChatApp />);
    await waitFor(() => {
      expect(screen.getByText("Pneuma-Seeker")).toBeInTheDocument();
    });
  });

  it("renders the dataset selector after auth", async () => {
    setupAuthSuccess();
    render(<ChatApp />);
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  it("redirects to login on 401 error during bootstrap", async () => {
    localStorage.setItem("token", "bad-token");
    const err = new ApiError(401, "Unauthorized");
    mockGetCurrentUser.mockRejectedValue(err);
    mockGetAccessibleDatasets.mockRejectedValue(err);

    render(<ChatApp />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2F");
    });
  });

  it("redirects to login on non-401 error during bootstrap", async () => {
    localStorage.setItem("token", "tok");
    mockGetCurrentUser.mockRejectedValue(new Error("Server error"));
    mockGetAccessibleDatasets.mockRejectedValue(new Error("Server error"));

    render(<ChatApp />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2F");
    });
  });
});

// ---------------------------------------------------------------------------
// Dataset selection
// ---------------------------------------------------------------------------

describe("ChatApp – dataset selection", () => {
  it("selects the first dataset by default when there is only one", async () => {
    setupAuthSuccess();
    render(<ChatApp />);
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveValue("db1");
    });
  });

  it("restores the saved dataset from localStorage for the user", async () => {
    localStorage.setItem("token", "tok");
    localStorage.setItem("selectedDataset:u1", "db2");
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetAccessibleDatasets.mockResolvedValue({ datasets: ["db1", "db2"] });
    mockGetAllChats.mockResolvedValue({
      chats: [],
      has_more: false,
      next_offset: null,
    });
    mockGetChatState.mockRejectedValue(new Error("no chat"));

    render(<ChatApp />);
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveValue("db2");
    });
  });
});

// ---------------------------------------------------------------------------
// Chat list
// ---------------------------------------------------------------------------

describe("ChatApp – chat list", () => {
  it("renders chat sessions in the sidebar", async () => {
    localStorage.setItem("token", "tok");
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetAccessibleDatasets.mockResolvedValue({ datasets: ["db1"] });
    mockGetAllChats.mockResolvedValue({
      chats: [
        {
          id: "c1",
          title: "My first chat",
          lastActive: new Date().toISOString(),
        },
      ],
      has_more: false,
      next_offset: null,
    });
    mockGetChatState.mockRejectedValue(new Error("no chat"));

    render(<ChatApp />);
    await waitFor(() => {
      expect(screen.getByText("My first chat")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Mobile sidebar backdrop stacking
// ---------------------------------------------------------------------------
//
// Regression coverage for a bug where the mobile drawer backdrop rendered
// *above* the sidebar instead of behind it, making the sidebar's text
// illegible. Root cause: .app-shell has `backdrop-filter`, which creates a
// CSS stacking context. A `position:fixed` backdrop that is a *sibling* of
// .app-shell always paints above the (non-positioned) app-shell box,
// regardless of any z-index nested inside it — including the sidebar's
// z-40. The fix moves the backdrop to be a descendant of .app-shell so its
// z-30 is compared directly against the sidebar's z-40 within the same
// stacking context. jsdom doesn't compute real paint order, so this test
// asserts the structural fact that makes the fix correct: the backdrop must
// be nested inside .app-shell, not a sibling of it.
describe("ChatApp – plan mode", () => {
  beforeEach(() => {
    mockGetChatHistory.mockResolvedValue({
      user_id: "u1",
      chat_id: "test-uuid",
      messages: [],
      dataset_name: "db1",
    });
  });

  async function renderAndOpenComposer() {
    setupAuthSuccess();
    const user = userEvent.setup();
    render(<ChatApp />);
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveValue("db1");
    });
    return user;
  }

  it("sends plan_mode: true in the streamChat payload when the toggle is on", async () => {
    mockStreamChat.mockReturnValue(
      toAsyncGenerator([{ sender: "done", text: "done", time_stamp: 0 }]),
    );
    const user = await renderAndOpenComposer();

    await user.click(screen.getByRole("button", { name: /plan mode/i }));
    await user.type(
      screen.getByPlaceholderText("Ask Pneuma-Seeker..."),
      "what should I look at?",
    );
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => {
      expect(mockStreamChat).toHaveBeenCalledWith(
        expect.objectContaining({ plan_mode: true }),
      );
    });
  });

  it("sends plan_mode: false by default", async () => {
    mockStreamChat.mockReturnValue(
      toAsyncGenerator([{ sender: "done", text: "done", time_stamp: 0 }]),
    );
    const user = await renderAndOpenComposer();

    await user.type(
      screen.getByPlaceholderText("Ask Pneuma-Seeker..."),
      "what should I look at?",
    );
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => {
      expect(mockStreamChat).toHaveBeenCalledWith(
        expect.objectContaining({ plan_mode: false }),
      );
    });
  });

  it("marks the message as a plan proposal and resets the toggle on a 'plan' event", async () => {
    mockStreamChat.mockReturnValue(
      toAsyncGenerator([
        { sender: "plan", text: "Here is my proposal.", time_stamp: 0 },
        { sender: "done", text: "done", time_stamp: 0 },
      ]),
    );
    const user = await renderAndOpenComposer();

    const toggle = screen.getByRole("button", { name: /plan mode/i });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await user.type(
      screen.getByPlaceholderText("Ask Pneuma-Seeker..."),
      "what should I look at?",
    );
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => {
      expect(screen.getByText("Here is my proposal.")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/proposed plan.*reply to confirm or adjust/i),
    ).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("does not reset the toggle when the send errors before any proposal arrives", async () => {
    mockStreamChat.mockReturnValue(
      // eslint-disable-next-line require-yield
      (async function* () {
        throw new Error("network error");
      })(),
    );
    const user = await renderAndOpenComposer();

    const toggle = screen.getByRole("button", { name: /plan mode/i });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await user.type(
      screen.getByPlaceholderText("Ask Pneuma-Seeker..."),
      "what should I look at?",
    );
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    // isStreaming flips back to false once handleSend's finally block runs,
    // observable via the send button reverting from "Thinking" to "Send".
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^send$/i }),
      ).toBeInTheDocument();
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

describe("ChatApp – mobile sidebar backdrop stacking", () => {
  it("renders the mobile backdrop inside the app-shell stacking context, not as its sibling", async () => {
    setupAuthSuccess();
    const { container } = render(<ChatApp />);
    await waitFor(() => {
      expect(screen.getByText("Pneuma-Seeker")).toBeInTheDocument();
    });

    const backdrop = container.querySelector(
      '[data-testid="chat-list-backdrop"]',
    );
    expect(backdrop).toBeInTheDocument();
    expect(backdrop?.closest(".app-shell")).not.toBeNull();
  });

  it("does not render the backdrop when the sidebar is closed", async () => {
    setupAuthSuccess();
    const user = userEvent.setup();
    const { container } = render(<ChatApp />);
    await waitFor(() => {
      expect(screen.getByText("Pneuma-Seeker")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/hide chats/i));

    expect(
      container.querySelector('[data-testid="chat-list-backdrop"]'),
    ).not.toBeInTheDocument();
  });

  it("closes the sidebar when the backdrop is clicked", async () => {
    setupAuthSuccess();
    const user = userEvent.setup();
    const { container } = render(<ChatApp />);
    await waitFor(() => {
      expect(screen.getByText("Pneuma-Seeker")).toBeInTheDocument();
    });

    const backdrop = container.querySelector(
      '[data-testid="chat-list-backdrop"]',
    ) as HTMLElement;
    await user.click(backdrop);

    expect(
      container.querySelector('[data-testid="chat-list-backdrop"]'),
    ).not.toBeInTheDocument();
  });
});
