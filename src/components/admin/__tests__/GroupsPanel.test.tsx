import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupsPanel from "@/components/admin/GroupsPanel";
import type { Group } from "@/lib/types";

jest.mock("../../../lib/api/auth", () => ({
  listGroups: jest.fn(),
  createGroup: jest.fn(),
  updateGroup: jest.fn(),
  deleteGroup: jest.fn(),
  getGroupPermissions: jest.fn(),
  setGroupPermission: jest.fn(),
  deleteGroupPermission: jest.fn(),
}));

jest.mock("../../../lib/api/chat", () => ({
  getAccessibleDatasets: jest.fn(),
}));

import {
  listGroups,
  createGroup,
  deleteGroup,
  getGroupPermissions,
  setGroupPermission,
  deleteGroupPermission,
} from "@/lib/api/auth";
import { getAccessibleDatasets } from "@/lib/api/chat";

const mockListGroups = listGroups as jest.Mock;
const mockCreateGroup = createGroup as jest.Mock;
const mockDeleteGroup = deleteGroup as jest.Mock;
const mockGetGroupPermissions = getGroupPermissions as jest.Mock;
const mockSetGroupPermission = setGroupPermission as jest.Mock;
const mockDeleteGroupPermission = deleteGroupPermission as jest.Mock;
const mockGetAccessibleDatasets = getAccessibleDatasets as jest.Mock;

const mockGroups: Group[] = [
  { group_id: "g1", name: "analysts", parent_group_id: null },
  { group_id: "g2", name: "admins", parent_group_id: null },
];

function setupDefaults() {
  mockListGroups.mockResolvedValue(mockGroups);
  mockCreateGroup.mockResolvedValue({
    group_id: "g3",
    name: "new-group",
    parent_group_id: null,
  });
  mockDeleteGroup.mockResolvedValue({ status: "ok" });
  mockGetGroupPermissions.mockResolvedValue({});
  mockGetAccessibleDatasets.mockResolvedValue({ datasets: ["db1", "db2"] });
  mockSetGroupPermission.mockResolvedValue({});
  mockDeleteGroupPermission.mockResolvedValue({});
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaults();
});

// ---------------------------------------------------------------------------
// Loading and rendering
// ---------------------------------------------------------------------------

describe("GroupsPanel – rendering", () => {
  it("shows loading state initially", () => {
    mockListGroups.mockImplementation(() => new Promise(() => {}));
    render(<GroupsPanel />);
    expect(screen.getByText(/loading groups/i)).toBeInTheDocument();
  });

  it("renders the group list after loading", async () => {
    render(<GroupsPanel />);
    await waitFor(() => {
      expect(screen.getByText("analysts")).toBeInTheDocument();
      expect(screen.getByText("admins")).toBeInTheDocument();
    });
  });

  it("shows empty state when there are no groups", async () => {
    mockListGroups.mockResolvedValue([]);
    render(<GroupsPanel />);
    await waitFor(() => {
      expect(screen.getByText(/no groups found/i)).toBeInTheDocument();
    });
  });

  it("shows error when loading fails", async () => {
    mockListGroups.mockRejectedValue(new Error("Failed to load groups."));
    render(<GroupsPanel />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load groups/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Create group
// ---------------------------------------------------------------------------

describe("GroupsPanel – create group", () => {
  it("opens the create modal when '+ New group' is clicked", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByRole("button", { name: /new group/i }));
    expect(screen.getByText("New group")).toBeInTheDocument();
  });

  it("creates a group and reloads the list", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByRole("button", { name: /new group/i }));
    await user.type(
      screen.getByPlaceholderText(/e\.g\. analysts/i),
      "engineers",
    );
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith(
        expect.objectContaining({ name: "engineers" }),
      );
    });
  });

  it("closes the modal on Cancel", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByRole("button", { name: /new group/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByText("New group")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Delete group
// ---------------------------------------------------------------------------

describe("GroupsPanel – delete group", () => {
  it("shows confirm prompt on first Delete click", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    expect(screen.getByText(/sure\?/i)).toBeInTheDocument();
  });

  it("calls deleteGroup when Yes is confirmed", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    await user.click(screen.getByRole("button", { name: /^yes$/i }));

    await waitFor(() => {
      expect(mockDeleteGroup).toHaveBeenCalledWith("g1");
    });
  });

  it("cancels deletion when No is clicked", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    await user.click(screen.getByRole("button", { name: /^no$/i }));

    expect(mockDeleteGroup).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Permissions panel (opens on row click)
// ---------------------------------------------------------------------------

describe("GroupsPanel – permissions panel", () => {
  it("shows the permissions panel when a group row is clicked", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByText("analysts").closest("tr")!);

    await waitFor(() => {
      expect(screen.getByText(/dataset access/i)).toBeInTheDocument();
    });
  });

  it("hides the permissions panel when the same row is clicked again", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    const row = screen.getByText("analysts").closest("tr")!;
    await user.click(row);
    await waitFor(() => screen.getByText(/dataset access/i));

    await user.click(row);
    await waitFor(() => {
      expect(screen.queryByText(/dataset access/i)).not.toBeInTheDocument();
    });
  });

  it("renders dataset access chips for existing dataset permissions", async () => {
    mockGetGroupPermissions.mockResolvedValue({ "dataset:access:db1": "true" });
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByText("analysts").closest("tr")!);

    await waitFor(() => {
      expect(screen.getByText("db1")).toBeInTheDocument();
    });
  });

  it("excludes already-granted datasets from the selector", async () => {
    mockGetGroupPermissions.mockResolvedValue({ "dataset:access:db1": "true" });
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByText("analysts").closest("tr")!);

    await waitFor(() => screen.getByText(/dataset access/i));

    // The dataset selector is a <select>; the key field input (with datalist) is also role=combobox.
    // Use container.querySelector("select") to target the <select> specifically.
    const allComboboxes = screen.getAllByRole("combobox");
    const select = allComboboxes.find((el) => el.tagName === "SELECT")!;
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.value,
    );
    expect(options).not.toContain("db1");
    expect(options).toContain("db2");
  });

  it("grants dataset access with correct key format when Grant is clicked", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByText("analysts").closest("tr")!);
    await waitFor(() => screen.getAllByRole("combobox"));

    const select = screen
      .getAllByRole("combobox")
      .find((el) => el.tagName === "SELECT")!;
    await user.selectOptions(select, "db1");
    await user.click(screen.getByRole("button", { name: /grant/i }));

    await waitFor(() => {
      expect(mockSetGroupPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: "g1",
          permission_key: "dataset:access:db1",
          permission_value: "true",
        }),
      );
    });
  });

  it("revokes dataset access when chip ✕ is clicked", async () => {
    mockGetGroupPermissions.mockResolvedValue({ "dataset:access:db1": "true" });
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByText("analysts").closest("tr")!);
    await waitFor(() => screen.getByText("db1"));

    await user.click(screen.getByTitle("Revoke db1"));

    await waitFor(() => {
      expect(mockDeleteGroupPermission).toHaveBeenCalledWith(
        "g1",
        "dataset:access:db1",
      );
    });
  });

  it("shows other permissions in the 'Other permissions' section", async () => {
    mockGetGroupPermissions.mockResolvedValue({ admin: "true" });
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByText("analysts").closest("tr")!);

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
    });
  });

  it("adds a generic permission via the key/value inputs", async () => {
    const user = userEvent.setup();
    render(<GroupsPanel />);
    await waitFor(() => screen.getByText("analysts"));

    await user.click(screen.getByText("analysts").closest("tr")!);
    await waitFor(() => screen.getByText(/other permissions/i));

    // Key input has a datalist (role=combobox); Value input is a plain textbox.
    const keyInput = screen.getByPlaceholderText("Key");
    const valInput = screen.getByPlaceholderText("Value");

    await user.type(keyInput, "user:management");
    await user.type(valInput, "true");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(mockSetGroupPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: "g1",
          permission_key: "user:management",
          permission_value: "true",
        }),
      );
    });
  });
});
