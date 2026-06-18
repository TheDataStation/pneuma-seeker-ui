import {
  login,
  logout,
  getCurrentUser,
  listUsers,
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupPermissions,
  setGroupPermission,
  deleteGroupPermission,
  updateUser,
  deleteUser,
} from "@/lib/api/auth";
import { request } from "@/lib/api/base";

jest.mock("../base", () => {
  const ActualApiError = class ApiError extends Error {
    status: number;
    constructor(status: number, msg: string) { super(msg); this.status = status; }
  };
  return {
    request: jest.fn(),
    getStoredToken: jest.fn(() => null),
    ApiError: ActualApiError,
  };
});

const mockRequest = request as jest.MockedFunction<typeof request>;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

describe("login", () => {
  it("calls POST /auth/login with the correct payload", async () => {
    mockRequest.mockResolvedValue({ access_token: "tok", token_type: "bearer", expires_at: "" } as any);
    await login({ email: "a@b.com", password: "pass" });
    expect(mockRequest).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "pass" }),
    });
  });

  it("stores the access token in localStorage", async () => {
    mockRequest.mockResolvedValue({ access_token: "mytoken", token_type: "bearer", expires_at: "" } as any);
    await login({ email: "a@b.com", password: "pass" });
    expect(localStorage.getItem("token")).toBe("mytoken");
  });

  it("returns the token response", async () => {
    const tokenResp = { access_token: "t", token_type: "bearer", expires_at: "2099-01-01" };
    mockRequest.mockResolvedValue(tokenResp as any);
    const result = await login({ email: "a@b.com", password: "pass" });
    expect(result).toEqual(tokenResp);
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe("logout", () => {
  it("calls POST /auth/logout", async () => {
    mockRequest.mockResolvedValue({ status: "ok" } as any);
    await logout();
    expect(mockRequest).toHaveBeenCalledWith("/auth/logout", { method: "POST" }, undefined);
  });

  it("removes the token from localStorage", async () => {
    localStorage.setItem("token", "tok");
    mockRequest.mockResolvedValue({ status: "ok" } as any);
    await logout();
    expect(localStorage.getItem("token")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getCurrentUser
// ---------------------------------------------------------------------------

describe("getCurrentUser", () => {
  it("calls GET /auth/me", async () => {
    mockRequest.mockResolvedValue({} as any);
    await getCurrentUser();
    expect(mockRequest).toHaveBeenCalledWith("/auth/me", { method: "GET" }, undefined);
  });
});

// ---------------------------------------------------------------------------
// User admin
// ---------------------------------------------------------------------------

describe("listUsers", () => {
  it("calls GET /auth/users", async () => {
    mockRequest.mockResolvedValue([] as any);
    await listUsers();
    expect(mockRequest).toHaveBeenCalledWith("/auth/users", { method: "GET" }, undefined);
  });
});

describe("updateUser", () => {
  it("calls PATCH /auth/users/:id with the patch payload", async () => {
    mockRequest.mockResolvedValue({} as any);
    await updateUser("u1", { username: "newname" });
    expect(mockRequest).toHaveBeenCalledWith("/auth/users/u1", {
      method: "PATCH",
      body: JSON.stringify({ username: "newname" }),
    }, undefined);
  });
});

describe("deleteUser", () => {
  it("calls DELETE /auth/users/:id", async () => {
    mockRequest.mockResolvedValue({} as any);
    await deleteUser("u1");
    expect(mockRequest).toHaveBeenCalledWith("/auth/users/u1", { method: "DELETE" }, undefined);
  });
});

// ---------------------------------------------------------------------------
// Group admin
// ---------------------------------------------------------------------------

describe("listGroups", () => {
  it("calls GET /auth/groups", async () => {
    mockRequest.mockResolvedValue([] as any);
    await listGroups();
    expect(mockRequest).toHaveBeenCalledWith("/auth/groups", { method: "GET" }, undefined);
  });
});

describe("createGroup", () => {
  it("calls POST /auth/groups with the group payload", async () => {
    mockRequest.mockResolvedValue({} as any);
    await createGroup({ name: "analysts", parent_group_id: null });
    expect(mockRequest).toHaveBeenCalledWith("/auth/groups", {
      method: "POST",
      body: JSON.stringify({ name: "analysts", parent_group_id: null }),
    }, undefined);
  });
});

describe("updateGroup", () => {
  it("calls PATCH /auth/groups/:id", async () => {
    mockRequest.mockResolvedValue({} as any);
    await updateGroup("g1", { name: "renamed" });
    expect(mockRequest).toHaveBeenCalledWith("/auth/groups/g1", {
      method: "PATCH",
      body: JSON.stringify({ name: "renamed" }),
    }, undefined);
  });
});

describe("deleteGroup", () => {
  it("calls DELETE /auth/groups/:id", async () => {
    mockRequest.mockResolvedValue({} as any);
    await deleteGroup("g1");
    expect(mockRequest).toHaveBeenCalledWith("/auth/groups/g1", { method: "DELETE" }, undefined);
  });
});

// ---------------------------------------------------------------------------
// Group permissions
// ---------------------------------------------------------------------------

describe("getGroupPermissions", () => {
  it("calls GET /auth/groups/:id/permissions with effective=false by default", async () => {
    mockRequest.mockResolvedValue({} as any);
    await getGroupPermissions("g1");
    expect(mockRequest).toHaveBeenCalledWith(
      "/auth/groups/g1/permissions?effective=false",
      { method: "GET" },
      undefined,
    );
  });

  it("passes effective=true when requested", async () => {
    mockRequest.mockResolvedValue({} as any);
    await getGroupPermissions("g1", true);
    expect(mockRequest).toHaveBeenCalledWith(
      "/auth/groups/g1/permissions?effective=true",
      { method: "GET" },
      undefined,
    );
  });
});

describe("setGroupPermission", () => {
  it("calls POST /auth/groups/permissions with the permission payload", async () => {
    mockRequest.mockResolvedValue({} as any);
    await setGroupPermission({ group_id: "g1", permission_key: "dataset:access:db1", permission_value: "true" });
    expect(mockRequest).toHaveBeenCalledWith(
      "/auth/groups/permissions",
      {
        method: "POST",
        body: JSON.stringify({ group_id: "g1", permission_key: "dataset:access:db1", permission_value: "true" }),
      },
      undefined,
    );
  });
});

describe("deleteGroupPermission", () => {
  it("calls DELETE /auth/groups/:id/permissions/:key (URL-encoded)", async () => {
    mockRequest.mockResolvedValue({} as any);
    await deleteGroupPermission("g1", "dataset:access:db1");
    expect(mockRequest).toHaveBeenCalledWith(
      "/auth/groups/g1/permissions/dataset%3Aaccess%3Adb1",
      { method: "DELETE" },
      undefined,
    );
  });
});
