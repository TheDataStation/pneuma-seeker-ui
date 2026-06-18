import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppHeader from "@/components/AppHeader";
import type { User } from "@/lib/types";

const mockUser: User = {
  user_id: "user-1",
  email: "test@example.com",
  username: "test@example.com",
  group_id: "group-1",
  group_name: "test-group",
  is_active: true,
};

const adminUser: User = { ...mockUser, group_name: "admin" };

const defaultProps = {
  isChatListOpen: false,
  setIsChatListOpen: jest.fn(),
  handleCreateNewChatSlot: jest.fn(),
  isUserMenuOpen: false,
  setIsUserMenuOpen: jest.fn(),
  user: mockUser,
  isLoggingOut: false,
  handleLogout: jest.fn(),
  selectedDataset: "dataset1",
  accessibleDatasets: ["dataset1"],
  handleDatasetChange: jest.fn(),
  isDatasetLocked: false,
  isDark: false,
  onToggleDark: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Dark mode toggle
// ---------------------------------------------------------------------------

describe("AppHeader – dark mode toggle", () => {
  it("renders the dark mode toggle button", () => {
    render(<AppHeader {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /switch to dark mode/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Switch to light mode' label when isDark=true", () => {
    render(<AppHeader {...defaultProps} isDark={true} />);
    expect(
      screen.getByRole("button", { name: /switch to light mode/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Switch to dark mode' label when isDark=false", () => {
    render(<AppHeader {...defaultProps} isDark={false} />);
    expect(
      screen.getByRole("button", { name: /switch to dark mode/i }),
    ).toBeInTheDocument();
  });

  it("calls onToggleDark once when the button is clicked", async () => {
    const onToggleDark = jest.fn();
    const user = userEvent.setup();
    render(<AppHeader {...defaultProps} onToggleDark={onToggleDark} />);
    await user.click(
      screen.getByRole("button", { name: /switch to dark mode/i }),
    );
    expect(onToggleDark).toHaveBeenCalledTimes(1);
  });

  it("does not call onToggleDark when other buttons are clicked", async () => {
    const onToggleDark = jest.fn();
    const user = userEvent.setup();
    render(<AppHeader {...defaultProps} onToggleDark={onToggleDark} />);
    await user.click(screen.getByRole("button", { name: /new chat/i }));
    expect(onToggleDark).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Core rendering
// ---------------------------------------------------------------------------

describe("AppHeader – core rendering", () => {
  it("renders the app title", () => {
    render(<AppHeader {...defaultProps} />);
    expect(screen.getByText("Pneuma-Seeker")).toBeInTheDocument();
  });

  it("renders the dataset selector with provided options", () => {
    render(
      <AppHeader
        {...defaultProps}
        accessibleDatasets={["ds1", "ds2"]}
        selectedDataset="ds1"
      />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("ds1");
    expect(screen.getByText("ds2")).toBeInTheDocument();
  });

  it("calls handleDatasetChange when a new dataset is selected", async () => {
    const handleDatasetChange = jest.fn();
    const user = userEvent.setup();
    render(
      <AppHeader
        {...defaultProps}
        accessibleDatasets={["ds1", "ds2"]}
        selectedDataset="ds1"
        handleDatasetChange={handleDatasetChange}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox"), "ds2");
    expect(handleDatasetChange).toHaveBeenCalledWith("ds2");
  });

  it("shows user email and group in the user menu when open", () => {
    render(<AppHeader {...defaultProps} isUserMenuOpen={true} />);
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/test-group/)).toBeInTheDocument();
  });

  it("shows 'Signing out...' text when isLoggingOut=true", () => {
    render(
      <AppHeader {...defaultProps} isUserMenuOpen={true} isLoggingOut={true} />,
    );
    expect(screen.getByText("Signing out...")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Dataset selector locking
// ---------------------------------------------------------------------------

describe("AppHeader – dataset selector", () => {
  it("is enabled when isDatasetLocked=false", () => {
    render(<AppHeader {...defaultProps} isDatasetLocked={false} />);
    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });

  it("is disabled when isDatasetLocked=true", () => {
    render(<AppHeader {...defaultProps} isDatasetLocked={true} />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("renders no options when accessibleDatasets is empty", () => {
    render(
      <AppHeader
        {...defaultProps}
        accessibleDatasets={[]}
        selectedDataset=""
      />,
    );
    const combobox = screen.getByRole("combobox");
    expect(combobox.querySelectorAll("option").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// New chat button
// ---------------------------------------------------------------------------

describe("AppHeader – new chat button", () => {
  it("calls handleCreateNewChatSlot when New chat is clicked", async () => {
    const handleCreateNewChatSlot = jest.fn();
    const user = userEvent.setup();
    render(
      <AppHeader
        {...defaultProps}
        handleCreateNewChatSlot={handleCreateNewChatSlot}
      />,
    );
    await user.click(screen.getByRole("button", { name: /new chat/i }));
    expect(handleCreateNewChatSlot).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// User menu toggle
// ---------------------------------------------------------------------------

describe("AppHeader – user menu toggle", () => {
  it("calls setIsUserMenuOpen(true) when menu button is clicked while closed", async () => {
    const setIsUserMenuOpen = jest.fn();
    const user = userEvent.setup();
    render(
      <AppHeader
        {...defaultProps}
        isUserMenuOpen={false}
        setIsUserMenuOpen={setIsUserMenuOpen}
      />,
    );
    await user.click(screen.getByRole("button", { name: /user menu/i }));
    expect(setIsUserMenuOpen).toHaveBeenCalledWith(true);
  });

  it("calls setIsUserMenuOpen(false) when menu button is clicked while open", async () => {
    const setIsUserMenuOpen = jest.fn();
    const user = userEvent.setup();
    render(
      <AppHeader
        {...defaultProps}
        isUserMenuOpen={true}
        setIsUserMenuOpen={setIsUserMenuOpen}
      />,
    );
    await user.click(screen.getByRole("button", { name: /user menu/i }));
    expect(setIsUserMenuOpen).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// Admin panel link
// ---------------------------------------------------------------------------

describe("AppHeader – admin panel link", () => {
  it("shows Admin panel link when user group is admin", () => {
    render(
      <AppHeader {...defaultProps} user={adminUser} isUserMenuOpen={true} />,
    );
    expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
  });

  it("does not show Admin panel link for non-admin users", () => {
    render(<AppHeader {...defaultProps} isUserMenuOpen={true} />);
    expect(screen.queryByText(/admin panel/i)).not.toBeInTheDocument();
  });
});
