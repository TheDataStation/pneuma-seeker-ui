import { render, screen, waitFor } from "@testing-library/react";
import { ChatApp } from "@/components/ChatApp";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = jest.fn();
const mockPush = jest.fn();

// InspectorSidebar (used by ChatApp) imports marked which is an ES module
jest.mock("marked", () => ({
  marked: { parse: (text: string) => `<p>${text}</p>` },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
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
  ApiError,
} from "@/lib/api";

const mockGetCurrentUser = getCurrentUser as jest.Mock;
const mockGetAccessibleDatasets = getAccessibleDatasets as jest.Mock;
const mockGetAllChats = getAllChats as jest.Mock;
const mockGetChatState = getChatState as jest.Mock;

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
    const err = new (ApiError as any)(401, "Unauthorized");
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
