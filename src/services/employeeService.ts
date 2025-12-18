import api from "./api";

export interface Employee {
  e_id: number;
  name: string;
  email: string;
  designation: string;
  mgr_id?: number;
}

export interface EmployeeCreateRequest {
  name: string;
  email: string;
  designation: string;
  mgr_id?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const employeeService = {
  // Get all employees with pagination
  getEmployees: async (
    page: number = 1,
    limit: number = 20,
    role?: string
  ): Promise<PaginatedResponse<Employee>> => {
    const url = role
      ? `/Employee/getall?role=${encodeURIComponent(role)}`
      : `/Employee/getall`;
    const response = await api.get(url);
    const data: Employee[] = response.data || [];
    return {
      data,
      total: data.length,
      page,
      limit,
    };
  },

  // Get employee by ID. Pass backend role (e.g. 'Admin'|'Manager'|'Developer') as required by backend.
  getEmployeeById: async (e_id: number, role: string): Promise<Employee> => {
    // Backend has GET /Employee/get?id=<e_id>&role=<role>
    const response = await api.get(
      `/Employee/get?id=${e_id}&role=${encodeURIComponent(role)}`
    );
    return response.data;
  },

  // Simple in-memory cache for employee lookups during app session
  _cache: {} as Record<number, Employee>,

  getEmployeeCached: async (e_id: number, role: string): Promise<Employee> => {
    if (!employeeService._cache)
      employeeService._cache = {} as Record<number, Employee>;
    const cached = employeeService._cache[e_id];
    if (cached) return cached;
    const emp = await employeeService.getEmployeeById(e_id, role);
    employeeService._cache[e_id] = emp;
    return emp;
  },

  // Create new employee
  createEmployee: async (
    employee: EmployeeCreateRequest,
    role?: string
  ): Promise<Employee> => {
    const url = role
      ? `/Employee/create?role=${encodeURIComponent(role)}`
      : `/Employee/create`;
    const response = await api.post(url, employee);
    return response.data;
  },

  // Update employee
  updateEmployee: async (
    e_id: number,
    employee: Partial<EmployeeCreateRequest>,
    role?: string
  ): Promise<Employee> => {
    const url = role
      ? `/Employee/update?id=${e_id}&role=${encodeURIComponent(role)}`
      : `/Employee/update?id=${e_id}`;
    const response = await api.put(url, employee);
    return response.data;
  },

  // Delete employee
  deleteEmployee: async (e_id: number): Promise<void> => {
    await api.delete(`/Employee/delete?id=${e_id}`);
  },

  // Get employees under a manager
  getEmployeesByManager: async (mgr_id: number): Promise<Employee[]> => {
    const resp = await api.get(`/Employee/getall`);
    const data: Employee[] = resp.data || [];
    return data.filter((e) => e.mgr_id === mgr_id) || [];
  },
};
