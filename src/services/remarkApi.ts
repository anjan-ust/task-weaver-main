import api from "./api";

const remarkApi = {
  getRemarksByTask: async (taskId: number, role: string) => {
    const resp = await api.get(`/Remark/getbytask`, {
      params: { task_id: taskId, role },
    });
    return resp.data;
  },

  createRemark: async (
    taskId: number,
    comment: string,
    file: File | null,
    role: string
  ) => {
    const form = new FormData();
    form.append("task_id", String(taskId));
    form.append("comment", comment);
    form.append("role", role);
    if (file) form.append("file", file, file.name);
    // Some environments set a global Content-Type (e.g. application/json).
    // For this multipart request we must ensure the browser/axios sets the
    // correct multipart boundary. Override headers for this call by
    // explicitly removing Content-Type so axios will let the runtime set it.
    const resp = await api.post(`/Remark/create`, form, {
      headers: { "Content-Type": undefined as unknown as string },
    });
    return resp.data;
  },
};

export default remarkApi;
