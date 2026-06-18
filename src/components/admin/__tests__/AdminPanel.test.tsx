import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPanel from "@/components/admin/AdminPanel";
import type { User } from "@/lib/types";

jest.mock("../UsersPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="users-panel">Users Panel</div>,
}));

jest.mock("../GroupsPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="groups-panel">Groups Panel</div>,
}));

const adminUser: User = {
  user_id: "u1",
  email: "admin@example.com",
  username: "admin",
  group_id: "g1",
  group_name: "admin",
  is_active: true,
};

beforeEach(() => jest.clearAllMocks());

describe("AdminPanel", () => {
  it("renders the admin panel heading", () => {
    render(<AdminPanel user={adminUser} />);
    expect(screen.getByText("Admin panel")).toBeInTheDocument();
  });

  it("shows the signed-in user's email", () => {
    render(<AdminPanel user={adminUser} />);
    expect(screen.getByText(/admin@example\.com/)).toBeInTheDocument();
  });

  it("renders the Users tab by default", () => {
    render(<AdminPanel user={adminUser} />);
    expect(screen.getByTestId("users-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("groups-panel")).not.toBeInTheDocument();
  });

  it("switches to Groups panel when the Groups tab is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminPanel user={adminUser} />);
    await user.click(screen.getByRole("button", { name: /groups/i }));
    expect(screen.getByTestId("groups-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("users-panel")).not.toBeInTheDocument();
  });

  it("switches back to Users panel when Users tab is clicked again", async () => {
    const user = userEvent.setup();
    render(<AdminPanel user={adminUser} />);
    await user.click(screen.getByRole("button", { name: /groups/i }));
    await user.click(screen.getByRole("button", { name: /users/i }));
    expect(screen.getByTestId("users-panel")).toBeInTheDocument();
  });

  it("renders a Back to app link", () => {
    render(<AdminPanel user={adminUser} />);
    expect(screen.getByText(/back to app/i)).toBeInTheDocument();
  });
});
