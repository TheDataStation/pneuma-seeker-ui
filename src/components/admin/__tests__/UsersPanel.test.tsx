import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersPanel from "@/components/admin/UsersPanel";
import type { User, Group } from "@/lib/types";

jest.mock("../../../lib/api/auth", () => ({
  listUsers: jest.fn(),
  listGroups: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getUserById: jest.fn(),
}));

import { listUsers, listGroups, updateUser, deleteUser } from "@/lib/api/auth";

const mockListUsers = listUsers as jest.Mock;
const mockListGroups = listGroups as jest.Mock;
const mockUpdateUser = updateUser as jest.Mock;
const mockDeleteUser = deleteUser as jest.Mock;

const mockUsers: User[] = [
  {
    user_id: "u1",
    email: "alice@example.com",
    username: "alice",
    group_id: "g1",
    group_name: "analysts",
    is_active: true,
  },
  {
    user_id: "u2",
    email: "bob@example.com",
    username: "bob",
    group_id: "g1",
    group_name: "analysts",
    is_active: false,
  },
];

const mockGroups: Group[] = [
  { group_id: "g1", name: "analysts", parent_group_id: null },
  { group_id: "g2", name: "admins", parent_group_id: null },
];

function setupDefaults() {
  mockListUsers.mockResolvedValue(mockUsers);
  mockListGroups.mockResolvedValue(mockGroups);
  mockUpdateUser.mockResolvedValue({});
  mockDeleteUser.mockResolvedValue({});
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaults();
});

// ---------------------------------------------------------------------------
// Loading and rendering
// ---------------------------------------------------------------------------

describe("UsersPanel – rendering", () => {
  it("shows loading state initially", () => {
    mockListUsers.mockImplementation(() => new Promise(() => {}));
    mockListGroups.mockImplementation(() => new Promise(() => {}));
    render(<UsersPanel />);
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  it("renders the user list after loading", async () => {
    render(<UsersPanel />);
    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });
  });

  it("shows the correct Active/Inactive badge", async () => {
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));
    const badges = screen.getAllByText(/active|inactive/i);
    expect(badges.some((b) => b.textContent === "Active")).toBe(true);
    expect(badges.some((b) => b.textContent === "Inactive")).toBe(true);
  });

  it("shows error when loading fails", async () => {
    mockListUsers.mockRejectedValue(new Error("Network error"));
    render(<UsersPanel />);
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("shows 'No users found.' when the list is empty", async () => {
    mockListUsers.mockResolvedValue([]);
    render(<UsersPanel />);
    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Search / filter
// ---------------------------------------------------------------------------

describe("UsersPanel – search", () => {
  it("filters users by email substring", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.type(screen.getByPlaceholderText(/search/i), "alice");

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.queryByText("bob@example.com")).not.toBeInTheDocument();
  });

  it("filters users by username substring", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.type(screen.getByPlaceholderText(/search/i), "bob");

    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
  });

  it("shows 'No users found.' when search matches nothing", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.type(screen.getByPlaceholderText(/search/i), "zzzzz");

    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
  });

  it("updates the user count label after filtering", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText(/2 users/i));

    await user.type(screen.getByPlaceholderText(/search/i), "alice");
    expect(screen.getByText(/1 user/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edit user
// ---------------------------------------------------------------------------

describe("UsersPanel – edit user", () => {
  it("opens the edit modal when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    expect(screen.getByText("Edit user")).toBeInTheDocument();
  });

  it("closes the modal when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByText("Edit user")).not.toBeInTheDocument();
  });

  it("calls updateUser and reloads when Save is clicked with changes", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.click(screen.getAllByRole("button", { name: /edit/i })[0]);

    const usernameInput = screen.getByDisplayValue("alice");
    await user.clear(usernameInput);
    await user.type(usernameInput, "alice2");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ username: "alice2" }),
      );
    });
  });

  it("shows error in modal when updateUser fails", async () => {
    mockUpdateUser.mockRejectedValue(new Error("Save failed."));
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    const usernameInput = screen.getByDisplayValue("alice");
    await user.clear(usernameInput);
    await user.type(usernameInput, "changed");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Delete user
// ---------------------------------------------------------------------------

describe("UsersPanel – delete user", () => {
  it("shows confirm prompt when Delete is clicked", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);

    expect(screen.getByText(/sure\?/i)).toBeInTheDocument();
  });

  it("calls deleteUser when Yes is confirmed", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    await user.click(screen.getByRole("button", { name: /^yes$/i }));

    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith("u1");
    });
  });

  it("removes the deleted user from the list", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    await user.click(screen.getByRole("button", { name: /^yes$/i }));

    await waitFor(() => {
      expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
    });
  });

  it("cancels deletion when No is clicked", async () => {
    const user = userEvent.setup();
    render(<UsersPanel />);
    await waitFor(() => screen.getByText("alice@example.com"));

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    await user.click(screen.getByRole("button", { name: /^no$/i }));

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });
});
