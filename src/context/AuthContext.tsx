import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { User, Role, AuthState } from "@/types";
import { authService, employeeService } from "@/services";
import { toast } from "react-toastify";

interface AuthContextType extends AuthState {
  login: (e_id: number, password: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    currentRole: "developer",
    isAuthenticated: false,
  });

  // Check if user is already logged in on mount
  useEffect(() => {
    try {
      const storedUser = authService.getCurrentUser();
      if (!storedUser || !authService.isAuthenticated()) {
        return;
      }

      // Handle migration from old format (role) to new format (roles)
      let userRoles = storedUser.roles;
      if (!userRoles && storedUser.role) {
        // Old format - migrate to new format
        userRoles = [storedUser.role];
        const updatedUser = { ...storedUser, roles: userRoles };
        delete updatedUser.role;
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      if (!userRoles) {
        // No roles at all - clear invalid data
        authService.logout();
        return;
      }

      // Normalize backend role strings to canonical forms: Admin/Manager/Developer
      const normalizeRoles = (roles: any): string[] => {
        const arr = Array.isArray(roles) ? roles : [roles];
        return arr.map((r: any) => {
          let s = String(r || "");
          // If it's like 'UserRole.DEVELOPER' take suffix
          if (s.includes(".")) s = s.split(".").pop() || s;
          s = s.trim();
          const lc = s.toLowerCase();
          if (lc === "admin") return "Admin";
          if (lc === "manager") return "Manager";
          if (lc === "developer" || lc === "dev") return "Developer";
          // fallback: capitalize
          return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        });
      };

      const normalizedRoles = normalizeRoles(userRoles);

      // Map backend role to frontend role type
      const roleMap: { [key: string]: Role } = {
        Admin: "admin",
        Manager: "manager",
        Developer: "developer",
      };

      const mappedRoles = normalizedRoles.map(
        (role: string) => roleMap[role] || "developer"
      ) as Role[];

      // Try to fetch full employee details (name/email) to display a proper username
      (async () => {
        let displayName = `User ${storedUser.e_id}`;
        let email = "";
        try {
          // Determine backend role to pass (use normalized backing role)
          const backendRole =
            Array.isArray(normalizedRoles) && normalizedRoles.length
              ? normalizedRoles[0]
              : "Developer";
          const emp = await employeeService.getEmployeeById(
            storedUser.e_id,
            backendRole
          );
          if (emp) {
            displayName = emp.name || displayName;
            email = emp.email || "";
            // persist enriched user info for future reloads
            const merged = { ...storedUser, name: displayName, email };
            localStorage.setItem("user", JSON.stringify(merged));
          }
        } catch (err) {
          // ignore and continue with fallback
        }

        setAuthState({
          user: {
            id: String(storedUser.e_id),
            name: displayName,
            email,
            roles: mappedRoles,
            status: (storedUser.status === "active" ||
            storedUser.status === "inactive"
              ? storedUser.status
              : "active") as "active" | "inactive",
          },
          currentRole: mappedRoles[0] || "developer",
          isAuthenticated: true,
        });
      })();
    } catch (error) {
      console.error("Error loading stored user:", error);
      // Clear invalid data
      authService.logout();
    }
  }, []);

  const login = useCallback(
    async (e_id: number, password: string): Promise<boolean> => {
      try {
        const response = await authService.login({ e_id, password });

        if (!response.user || !response.user.roles) {
          throw new Error("Invalid response from server");
        }

        // Normalize and map backend roles to frontend role types
        const normalizeRoles = (roles: any): string[] => {
          const arr = Array.isArray(roles) ? roles : [roles];
          return arr.map((r: any) => {
            let s = String(r || "");
            if (s.includes(".")) s = s.split(".").pop() || s;
            s = s.trim();
            const lc = s.toLowerCase();
            if (lc === "admin") return "Admin";
            if (lc === "manager") return "Manager";
            if (lc === "developer" || lc === "dev") return "Developer";
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
          });
        };

        const normalized = normalizeRoles(response.user.roles);
        const roleMap: { [key: string]: Role } = {
          Admin: "admin",
          Manager: "manager",
          Developer: "developer",
        };

        const mappedRoles = normalized.map(
          (role) => roleMap[role] || "developer"
        ) as Role[];

        // Fetch employee details to get display name/email
        let displayName = `User ${response.user.e_id}`;
        let email = "";
        try {
          const backendRole =
            Array.isArray(normalized) && normalized.length
              ? normalized[0]
              : "Developer";
          const emp = await employeeService.getEmployeeById(
            response.user.e_id,
            backendRole
          );
          if (emp) {
            displayName = emp.name || displayName;
            email = emp.email || "";
            const merged = { ...response.user, name: displayName, email };
            localStorage.setItem("user", JSON.stringify(merged));
          }
        } catch (err) {
          // ignore and fallback
        }

        setAuthState({
          user: {
            id: String(response.user.e_id),
            name: displayName,
            email,
            roles: mappedRoles,
            status: (response.user.status === "active" ||
            response.user.status === "inactive"
              ? response.user.status
              : "active") as "active" | "inactive",
          },
          currentRole: mappedRoles[0] || "developer",
          isAuthenticated: true,
        });

        toast.success("Login successful!");
        return true;
      } catch (error: any) {
        console.error("Login error:", error);
        toast.error(
          error.response?.data?.detail ||
            "Login failed. Please check your credentials."
        );
        return false;
      }
    },
    []
  );

  const logout = useCallback(() => {
    authService.logout();
    setAuthState({
      user: null,
      currentRole: "developer",
      isAuthenticated: false,
    });
    toast.info("Logged out successfully");
  }, []);

  const switchRole = useCallback(
    (role: Role) => {
      if (authState.user?.roles.includes(role)) {
        setAuthState((prev) => ({
          ...prev,
          currentRole: role,
        }));
        toast.info(`Switched to ${role} role`);
      }
    },
    [authState.user?.roles]
  );

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
