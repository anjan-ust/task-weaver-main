import api from "./api";

export interface LoginRequest {
  e_id: number;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    e_id: number;
    roles: string[];
    status: string;
  };
}

export const authService = {
  // Login user
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post("/auth/login", credentials);

    // Store token and user info in localStorage
    if (response.data.access_token) {
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response.data;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("token");
  },

  // Get token
  getToken: (): string | null => {
    return localStorage.getItem("token");
  },
};
