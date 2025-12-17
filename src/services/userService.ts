import api from "./api";

export type UserRole = "Admin" | "Manager" | "Developer";
export type UserStatus = "active" | "inactive";

export interface User {
  e_id: number;
  password?: string;
  role: UserRole;
  status: UserStatus;
}

export interface UserCreateRequest {
  e_id: number;
  password: string;
  role: UserRole;
  status?: UserStatus;
}

export interface UserUpdateRequest {
  password?: string;
  role?: UserRole;
  status?: UserStatus;
}

export const userService = {
  // Get all users. If role is provided, pass it to the backend (Admin required to fetch all users).
  getUsers: async (role?: string): Promise<User[]> => {
    const url = role
      ? `/Users/getall?role=${encodeURIComponent(role)}`
      : `/Users/getall`;
    const response = await api.get(url);
    return response.data || [];
  },

  // Get user by ID
  getUserById: async (e_id: number): Promise<User> => {
    const response = await api.get(`/Users/get?id=${e_id}`);
    return response.data;
  },

  // Create new user
  createUser: async (user: UserCreateRequest): Promise<User> => {
    const response = await api.post(`/Users/create`, user);
    return response.data;
  },

  // Update user
  updateUser: async (e_id: number, user: UserUpdateRequest): Promise<User> => {
    const response = await api.put(`/Users/update?id=${e_id}`, user);
    return response.data;
  },

  // Delete user
  deleteUser: async (e_id: number): Promise<void> => {
    await api.delete(`/Users/delete?id=${e_id}`);
  },

  // Get users by role (e.g. 'Manager')
  getUsersByRole: async (role: string): Promise<User[]> => {
    const response = await api.get(
      `/Users/getbyrole?role=${encodeURIComponent(role)}`
    );
    return response.data || [];
  },

  // Change user status
  changeUserStatus: async (e_id: number, status: UserStatus): Promise<User> => {
    const response = await api.put(`/Users/update?id=${e_id}`, { status });
    return response.data;
  },
};
