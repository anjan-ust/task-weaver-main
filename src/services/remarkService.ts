import api from "./api";

export interface Remark {
  _id: string;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  updated_at?: string;
}

export interface RemarkCreateRequest {
  task_id: number;
  comment: string;
}

export const remarkService = {
  // Get remarks for a task
  getRemarksByTask: async (task_id: number): Promise<Remark[]> => {
    const response = await api.get(`/api/remarks/task/${task_id}`);
    return response.data || [];
  },

  // Create new remark
  // createRemark requires e_id in header on the backend and accepts optional file upload
  createRemark: async (
    remark: RemarkCreateRequest,
    e_id: number,
    file?: File | null
  ): Promise<Remark> => {
    const form = new FormData();
    form.append("task_id", String(remark.task_id));
    form.append("comment", remark.comment);
    if (file) form.append("file", file);
    const response = await api.post(`/api/remarks/create`, form, {
      headers: { "Content-Type": "multipart/form-data", e_id: String(e_id) },
    });
    return response.data;
  },

  // Update remark
  // update uses PUT /api/remarks/{remark_id} with x_user_id and x_role headers
  updateRemark: async (
    remark_id: string,
    comment: string,
    x_user_id: number,
    x_role: string
  ): Promise<Remark> => {
    const form = new FormData();
    form.append("comment", comment);
    const response = await api.put(`/api/remarks/${remark_id}`, form, {
      headers: {
        "Content-Type": "multipart/form-data",
        x_user_id: String(x_user_id),
        x_role,
      },
    });
    return response.data;
  },

  // Delete remark
  deleteRemark: async (remark_id: string): Promise<void> => {
    await api.delete(`/api/remarks/${remark_id}`);
  },
};
