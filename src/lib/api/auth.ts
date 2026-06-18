// src/lib/api/auth.ts — mirrors routers/auth.py
import { getStoredToken, request } from "./base";
import type {
  ChangePasswordRequest,
  Group,
  GroupCreateRequest,
  LoginRequest,
  RegisterRequest,
  SetPermissionRequest,
  TokenResponse,
  UpdateGroupRequest,
  UpdateMeRequest,
  UpdateUserGroupRequest,
  UpdateUserRequest,
  User,
} from "../types";

/* -------------------------------------------------------------------------- */
/* Session                                                                     */
/* -------------------------------------------------------------------------- */

export async function register(payload: RegisterRequest): Promise<User> {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const data = await request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (typeof window !== "undefined" && data.access_token) {
    localStorage.setItem("token", data.access_token);
  }

  return data;
}

export async function logout(token?: string): Promise<{ status: string }> {
  const result = await request<{ status: string }>("/auth/logout", { method: "POST" }, token);
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
  return result;
}

export async function getCurrentUser(token?: string): Promise<User> {
  return request<User>("/auth/me", { method: "GET" }, token);
}

/* -------------------------------------------------------------------------- */
/* Self-service profile / password                                             */
/* -------------------------------------------------------------------------- */

export async function updateMe(payload: UpdateMeRequest, token?: string): Promise<User> {
  return request<User>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function changePassword(
  payload: ChangePasswordRequest,
  token?: string,
): Promise<{ status: string }> {
  return request<{ status: string }>("/auth/me/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

/* -------------------------------------------------------------------------- */
/* Users (admin)                                                               */
/* -------------------------------------------------------------------------- */

export async function listUsers(token?: string): Promise<User[]> {
  return request<User[]>("/auth/users", { method: "GET" }, token);
}

export async function getUserById(user_id: string, token?: string): Promise<User> {
  return request<User>(`/auth/users/${user_id}`, { method: "GET" }, token);
}

export async function updateUser(
  user_id: string,
  payload: UpdateUserRequest,
  token?: string,
): Promise<User> {
  return request<User>(`/auth/users/${user_id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteUser(
  user_id: string,
  token?: string,
): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>(
    `/auth/users/${user_id}`,
    { method: "DELETE" },
    token,
  );
}

export async function changeUserGroup(
  payload: UpdateUserGroupRequest,
  token?: string,
): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>("/auth/users/change-group", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

/* -------------------------------------------------------------------------- */
/* Groups (admin)                                                              */
/* -------------------------------------------------------------------------- */

export async function createGroup(
  payload: GroupCreateRequest,
  token?: string,
): Promise<Group> {
  return request<Group>("/auth/groups", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function listGroups(token?: string): Promise<Group[]> {
  return request<Group[]>("/auth/groups", { method: "GET" }, token);
}

export async function getGroupById(group_id: string, token?: string): Promise<Group> {
  return request<Group>(`/auth/groups/${group_id}`, { method: "GET" }, token);
}

export async function updateGroup(
  group_id: string,
  payload: UpdateGroupRequest,
  token?: string,
): Promise<Group> {
  return request<Group>(`/auth/groups/${group_id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteGroup(
  group_id: string,
  token?: string,
): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>(
    `/auth/groups/${group_id}`,
    { method: "DELETE" },
    token,
  );
}

/* -------------------------------------------------------------------------- */
/* Group permissions (admin)                                                   */
/* -------------------------------------------------------------------------- */

export async function getMyGroupPermissions(
  effective = false,
  token?: string,
): Promise<Record<string, string>> {
  return request<Record<string, string>>(
    `/auth/groups/permissions?effective=${effective}`,
    { method: "GET" },
    token,
  );
}

export async function getGroupPermissions(
  group_id: string,
  effective = false,
  token?: string,
): Promise<Record<string, string>> {
  return request<Record<string, string>>(
    `/auth/groups/${group_id}/permissions?effective=${effective}`,
    { method: "GET" },
    token,
  );
}

export async function setGroupPermission(
  payload: SetPermissionRequest,
  token?: string,
): Promise<{ status: string; group_id: string; permission_key: string; permission_value: string }> {
  return request("/auth/groups/permissions", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteGroupPermission(
  group_id: string,
  permission_key: string,
  token?: string,
): Promise<{ status: string; group_id: string; permission_key: string }> {
  return request(
    `/auth/groups/${group_id}/permissions/${encodeURIComponent(permission_key)}`,
    { method: "DELETE" },
    token,
  );
}

export { getStoredToken };
