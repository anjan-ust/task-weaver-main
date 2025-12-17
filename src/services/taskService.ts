import api from "./api";

export type TaskStatus = "to_do" | "in_progress" | "review" | "done";
export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  t_id: number;
  title: string;
  description: string;
  created_by: number;
  assigned_to?: number;
  assigned_by?: number;
  assigned_at?: string;
  updated_by?: number;
  updated_at?: string;
  priority: TaskPriority;
  status: TaskStatus;
  reviewer?: number;
  expected_closure: string;
  actual_closure?: string;
}

export interface TaskCreateRequest {
  title: string;
  description: string;
  assigned_to?: number;
  assigned_by?: number;
  assigned_at?: string;
  priority: TaskPriority;
  reviewer?: number;
  expected_closure: string;
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  assigned_to?: number;
  priority?: TaskPriority;
  status?: TaskStatus;
  reviewer?: number;
  expected_closure?: string;
}

export interface TaskStatusUpdateRequest {
  status: TaskStatus;
  remark?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const taskService = {
  // Get all tasks with pagination and filters
  getTasks: async (
    page: number = 1,
    limit: number = 10,
    status?: TaskStatus,
    assigned_to?: number,
    role?: string
  ): Promise<PaginatedResponse<Task>> => {
    // Backend returns a list for /Task/getall and expects a `role` query param.
    const url = `/Task/getall${
      role ? `?role=${encodeURIComponent(role)}` : ""
    }`;
    const response = await api.get(url);
    const data: Task[] = response.data || [];
    return {
      data,
      total: data.length,
      page,
      limit,
    };
  },

  // Get task by ID
  getTaskById: async (t_id: number): Promise<Task> => {
    const response = await api.get(`/Task/get?id=${t_id}`);
    return response.data;
  },

  // Create new task (optionally provide role as backend expects a `role` query param)
  createTask: async (task: TaskCreateRequest, role?: string): Promise<Task> => {
    const url = role
      ? `/Task/create?role=${encodeURIComponent(role)}`
      : "/Task/create";
    const response = await api.post(url, task);
    return response.data;
  },

  // Update task
  updateTask: async (
    t_id: number,
    task: TaskUpdateRequest,
    role: string
  ): Promise<Task> => {
    const response = await api.put(
      `/Task/update?id=${t_id}&role=${role}`,
      task
    );
    return response.data;
  },

  // Update task status using backend patch endpoint (requires role)
  updateTaskStatus: async (
    t_id: number,
    statusUpdate: TaskStatusUpdateRequest,
    role: string
  ): Promise<Task> => {
    const url = `/Task/patch?id=${t_id}&status=${encodeURIComponent(
      statusUpdate.status as unknown as string
    )}&role=${encodeURIComponent(role)}`;
    const response = await api.patch(url);
    return response.data;
  },

  // Delete task (backend expects role and id query params)
  deleteTask: async (t_id: number, role: string): Promise<void> => {
    await api.delete(
      `/Task/delete?id=${t_id}&role=${encodeURIComponent(role)}`
    );
  },

  // Get tasks by status (for Kanban board)
  getTasksByStatus: async (
    status: TaskStatus,
    role?: string
  ): Promise<Task[]> => {
    const url = `/Task/getbystatus?status=${encodeURIComponent(
      status as unknown as string
    )}${role ? `&role=${encodeURIComponent(role)}` : ""}`;
    const response = await api.get(url);
    return response.data || [];
  },

  // Get my tasks (assigned to current user)
  // Note: backend exposes role-based listing via /Task/getall; use getTasks/getTasksByStatus
  getMyTasks: async (e_id: number, role?: string): Promise<Task[]> => {
    const resp = await api.get(
      `/Task/getall${role ? `?role=${encodeURIComponent(role)}` : ""}`
    );
    const data: Task[] = resp.data || [];
    // filter client-side for assigned_to
    return data.filter((t) => t.assigned_to === e_id) || [];
  },

  // Get tasks created by user (client-side filter)
  getTasksCreatedBy: async (e_id: number, role?: string): Promise<Task[]> => {
    const resp = await api.get(
      `/Task/getall${role ? `?role=${encodeURIComponent(role)}` : ""}`
    );
    const data: Task[] = resp.data || [];
    return data.filter((t) => t.created_by === e_id) || [];
  },
};
