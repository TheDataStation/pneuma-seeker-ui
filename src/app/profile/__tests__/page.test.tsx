import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "@/app/profile/page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../../../lib/api", () => ({
  getCurrentUser: jest.fn(),
  updateMe: jest.fn(),
  changePassword: jest.fn(),
}));

import { getCurrentUser, updateMe, changePassword } from "@/lib/api";

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockUpdateMe = updateMe as jest.MockedFunction<typeof updateMe>;
const mockChangePassword = changePassword as jest.MockedFunction<typeof changePassword>;

const fakeUser = {
  user_id: "u1",
  email: "user@example.com",
  username: "myuser",
  group_id: "g1",
  group_name: "analysts",
  is_active: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(fakeUser);
});

// ---------------------------------------------------------------------------
// Loading / auth
// ---------------------------------------------------------------------------

describe("ProfilePage – loading and auth", () => {
  it("shows loading state initially", () => {
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));
    render(<ProfilePage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("redirects to login when getCurrentUser rejects", async () => {
    mockGetCurrentUser.mockRejectedValue(new Error("Unauthorized"));
    render(<ProfilePage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login?next=/profile");
    });
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("ProfilePage – rendering", () => {
  it("displays the user email and group after loading", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
      expect(screen.getByText("analysts")).toBeInTheDocument();
    });
  });

  it("pre-fills the username input with the current username", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toHaveValue("myuser");
    });
  });

  it("renders both the username and change password forms", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/save username/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^change password$/i })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Update username
// ---------------------------------------------------------------------------

describe("ProfilePage – update username", () => {
  it("calls updateMe with the new username on submit", async () => {
    mockUpdateMe.mockResolvedValue({ ...fakeUser, username: "newname" });
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByDisplayValue("myuser"));
    const usernameInput = screen.getByDisplayValue("myuser");
    await user.clear(usernameInput);
    await user.type(usernameInput, "newname");
    await user.click(screen.getByRole("button", { name: /save username/i }));
    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith({ username: "newname" });
    });
  });

  it("shows success message after username update", async () => {
    mockUpdateMe.mockResolvedValue({ ...fakeUser, username: "newname" });
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByLabelText(/username/i));
    await user.click(screen.getByRole("button", { name: /save username/i }));
    await waitFor(() => {
      expect(screen.getByText(/username updated/i)).toBeInTheDocument();
    });
  });

  it("shows an error when username is empty", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByDisplayValue("myuser"));
    await user.clear(screen.getByDisplayValue("myuser"));
    await user.click(screen.getByRole("button", { name: /save username/i }));
    await waitFor(() => {
      expect(screen.getByText(/cannot be empty/i)).toBeInTheDocument();
    });
    expect(mockUpdateMe).not.toHaveBeenCalled();
  });

  it("shows an error message when updateMe rejects", async () => {
    mockUpdateMe.mockRejectedValue(new Error("Username already taken"));
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByLabelText(/username/i));
    await user.click(screen.getByRole("button", { name: /save username/i }));
    await waitFor(() => {
      expect(screen.getByText(/username already taken/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

describe("ProfilePage – change password", () => {
  async function fillPasswordForm(
    user: ReturnType<typeof userEvent.setup>,
    current: string,
    newPw: string,
    confirm: string,
  ) {
    await user.type(screen.getByLabelText(/current password/i), current);
    await user.type(screen.getByLabelText(/^new password$/i), newPw);
    await user.type(screen.getByLabelText(/^confirm new password$/i), confirm);
  }

  it("calls changePassword with correct payload on valid submit", async () => {
    mockChangePassword.mockResolvedValue({ status: "ok" });
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByLabelText(/current password/i));
    await fillPasswordForm(user, "oldpass", "newpass1", "newpass1");
    await user.click(screen.getByRole("button", { name: /^change password$/i }));
    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        current_password: "oldpass",
        new_password: "newpass1",
      });
    });
  });

  it("shows success message after password change", async () => {
    mockChangePassword.mockResolvedValue({ status: "ok" });
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByLabelText(/current password/i));
    await fillPasswordForm(user, "oldpass", "newpass1", "newpass1");
    await user.click(screen.getByRole("button", { name: /^change password$/i }));
    await waitFor(() => {
      expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
    });
  });

  it("clears password fields after successful change", async () => {
    mockChangePassword.mockResolvedValue({ status: "ok" });
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByLabelText(/current password/i));
    await fillPasswordForm(user, "oldpass", "newpass1", "newpass1");
    await user.click(screen.getByRole("button", { name: /^change password$/i }));
    await waitFor(() => screen.getByText(/password changed successfully/i));
    expect(screen.getByLabelText(/current password/i)).toHaveValue("");
    expect(screen.getByLabelText(/^new password$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^confirm new password$/i)).toHaveValue("");
  });

  it("shows error when new passwords do not match", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByLabelText(/current password/i));
    await fillPasswordForm(user, "oldpass", "newpass1", "different");
    await user.click(screen.getByRole("button", { name: /^change password$/i }));
    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("shows error when new password is too short", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByLabelText(/current password/i));
    await fillPasswordForm(user, "oldpass", "short", "short");
    await user.click(screen.getByRole("button", { name: /^change password$/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("shows error message when changePassword rejects", async () => {
    mockChangePassword.mockRejectedValue(new Error("Incorrect current password"));
    const user = userEvent.setup();
    render(<ProfilePage />);
    await waitFor(() => screen.getByLabelText(/current password/i));
    await fillPasswordForm(user, "wrongpass", "newpass1", "newpass1");
    await user.click(screen.getByRole("button", { name: /^change password$/i }));
    await waitFor(() => {
      expect(screen.getByText(/incorrect current password/i)).toBeInTheDocument();
    });
  });
});
