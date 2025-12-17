export type Role = 'admin' | 'manager' | 'developer';

export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'done';

export type Priority = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  status: 'active' | 'inactive';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  designation: string;
  managerId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  priority: Priority;
  status: TaskStatus;
  reviewer?: string;
  expectedClosure: string;
  actualClosure?: string;
}

export interface Remark {
  id: string;
  taskId: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  currentRole: Role;
  isAuthenticated: boolean;
}
