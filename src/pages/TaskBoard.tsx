import React, { useState, useEffect } from "react";
import { taskService } from "@/services/taskService";
import { mapBackendTaskToFrontend } from "@/lib/utils";
import KanbanBoard from "@/components/tasks/KanbanBoard";
import { Task, TaskStatus, Priority } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { employeeService } from "@/services/employeeService";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Calendar,
  User,
  MessageSquare,
  Clock,
  Eye,
} from "lucide-react";
import remarkApi from "@/services/remarkApi";
import { formatDistanceToNow } from "date-fns";
import api from "@/services/api";

const TaskBoard: React.FC<{ onTasksUpdated?: () => void }> = ({
  onTasksUpdated,
}) => {
  const { currentRole, user } = useAuth();
  const { toast } = useToast();
  // Ensure error messages passed to toast are strings (avoid passing raw objects)
  const safeErrMsg = (err: any, fallback = "An error occurred") => {
    try {
      const detail = err?.response?.data?.detail ?? err?.message ?? err;
      if (!detail) return fallback;
      if (typeof detail === "string") return detail;
      // If it's an array or object, stringify sensibly
      return typeof detail === "object"
        ? JSON.stringify(detail)
        : String(detail);
    } catch (e) {
      return fallback;
    }
  };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [managerEmployees, setManagerEmployees] = useState<
    { e_id: number; name: string }[]
  >([]);
  const [assigneeSelection, setAssigneeSelection] = useState<string | null>(
    null
  );
  const [managerReviewers, setManagerReviewers] = useState<
    { e_id: number; name: string }[]
  >([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null);
  // For manager we'll keep all fetched tasks and allow switching views
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<
    "created" | "assigned" | "reviewer" | "all"
  >(currentRole === "manager" ? "created" : "all");

  // Reset view mode when role toggles
  useEffect(() => {
    if (currentRole === "manager") setViewMode("created");
    else setViewMode("all");
  }, [currentRole]);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    let mounted = true;
    const fetchTasks = async () => {
      if (!user?.id) return;
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        const e_id = parseInt(user.id, 10);
        let backendTasksRaw: any[] = [];

        if (currentRole === "manager") {
          // Managers should see tasks they review (reviewer == manager.e_id)
          const resp = await taskService.getTasks(
            1,
            1000,
            undefined,
            undefined,
            backendRole
          );
          // taskService.getTasks returns PaginatedResponse<Task>
          backendTasksRaw = resp.data || [];
        } else if (currentRole === "admin") {
          // Admin sees all tasks
          const resp = await taskService.getTasks(
            1,
            1000,
            undefined,
            undefined,
            backendRole
          );
          backendTasksRaw = resp.data || [];
        } else {
          // Developer/other roles: show tasks assigned to this user
          backendTasksRaw = await taskService.getMyTasks(e_id, backendRole);
        }

        if (!mounted) return;
        const frontTasksAll = backendTasksRaw.map(mapBackendTaskToFrontend);
        // Keep all tasks in state for manager so we can switch views client-side
        if (currentRole === "manager") {
          setAllTasks(frontTasksAll);
          // default viewMode controls which subset is shown; compute initial subset
          const created = frontTasksAll.filter(
            (t) => t.createdBy === String(e_id)
          );
          setTasks(created);
        } else {
          setTasks(frontTasksAll);
        }
      } catch (err) {
        console.error("Error fetching tasks", err);
      }
    };

    fetchTasks();

    return () => {
      mounted = false;
    };
  }, [user?.id, currentRole]);

  // For managers and admins: fetch employees so they can assign
  useEffect(() => {
    if ((currentRole !== "manager" && currentRole !== "admin") || !user?.id)
      return;
    let mounted = true;
    const load = async () => {
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        // getEmployees will return employees visible to this manager (backend filters by mgr_id)
        const resp = await employeeService.getEmployees(1, 1000, backendRole);
        if (!mounted) return;
        const list = (resp.data || []).map((e: any) => ({
          e_id: e.e_id,
          name: e.name || `Employee ${e.e_id}`,
        }));
        setManagerEmployees(list);
      } catch (err) {
        console.error("Failed to load manager employees", err);
        setManagerEmployees([]);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentRole, user?.id]);

  // When a manager/admin opens a task, fetch possible reviewers (Managers) for reviewer dropdown

  const getEmployeeName = async (id?: string) => {
    if (!id) return undefined;
    if (employeeNames[id]) return employeeNames[id];
    try {
      const backendRoleMap: { [k: string]: string } = {
        admin: "Admin",
        manager: "Manager",
        developer: "Developer",
      };
      const backendRole = backendRoleMap[currentRole] || "Developer";
      const emp = await employeeService.getEmployeeCached(
        parseInt(id, 10),
        backendRole
      );
      setEmployeeNames((s) => ({ ...s, [id]: emp.name }));
      return emp.name;
    } catch (err) {
      return undefined;
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [remarksOnlyTask, setRemarksOnlyTask] = useState<Task | null>(null);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(
    null
  );
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [imageModalAlt, setImageModalAlt] = useState<string | null>(null);

  // When a task is opened, eagerly resolve assignedTo and reviewer names into cache
  useEffect(() => {
    let mounted = true;
    const loadNames = async () => {
      if (!selectedTask) return;
      const ids: string[] = [];
      if (selectedTask.assignedTo) ids.push(selectedTask.assignedTo);
      if (selectedTask.reviewer) ids.push(selectedTask.reviewer);
      if (ids.length === 0) return;
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        for (const id of ids) {
          if (!id) continue;
          if (employeeNames[id]) continue; // already cached
          try {
            const emp = await employeeService.getEmployeeCached(
              parseInt(id, 10),
              backendRole
            );
            if (!mounted) return;
            if (emp?.name) {
              setEmployeeNames((s) => ({ ...s, [id]: emp.name }));
            }
          } catch (e) {
            // ignore individual lookup failures; we will fall back to ID display
            // eslint-disable-next-line no-console
            console.debug("Failed to load employee name for", id, e);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to eagerly load employee names", e);
      }
    };
    loadNames();
    return () => {
      mounted = false;
    };
    // include employeeNames so we don't refetch names we already have
  }, [selectedTask, currentRole, employeeNames]);

  // When a manager/admin opens a task, fetch possible reviewers (Managers) for reviewer dropdown
  useEffect(() => {
    let mounted = true;
    const loadReviewers = async () => {
      if (!selectedTask) return;
      // editable if current user is Admin or Manager who created the task
      const isEditableReviewer =
        currentRole === "admin" ||
        (currentRole === "manager" && selectedTask.createdBy === user?.id);
      if (!isEditableReviewer) return;

      try {
        // get users with Manager role
        const mgrUsers = await userService.getUsersByRole("Manager");
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        const list: { e_id: number; name: string }[] = [];
        for (const u of mgrUsers || []) {
          try {
            const emp = await employeeService.getEmployeeCached(
              u.e_id,
              backendRole
            );
            list.push({ e_id: u.e_id, name: emp?.name || String(u.e_id) });
          } catch (err) {
            // fallback to id
            list.push({ e_id: u.e_id, name: String(u.e_id) });
          }
        }
        if (!mounted) return;
        setManagerReviewers(list);
      } catch (err) {
        console.error("Failed to load manager reviewers", err);
        setManagerReviewers([]);
      }
    };
    loadReviewers();
    return () => {
      mounted = false;
    };
  }, [selectedTask, currentRole, user?.id]);

  // Filter tasks
  // derive tasks to display depending on manager viewMode
  let displayedTasks = tasks;
  if (currentRole === "manager") {
    if (viewMode === "created") {
      displayedTasks = allTasks.filter(
        (t) => t.createdBy === String(parseInt(user?.id || "0", 10))
      );
    } else if (viewMode === "assigned") {
      displayedTasks = allTasks.filter(
        (t) => t.assignedBy === String(parseInt(user?.id || "0", 10))
      );
    } else if (viewMode === "reviewer") {
      displayedTasks = allTasks.filter(
        (t) => t.reviewer === String(parseInt(user?.id || "0", 10))
      );
    } else {
      displayedTasks = allTasks;
    }
  }

  const filteredTasks = displayedTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    // initialize assignee selection for dialog (use sentinel "none" when unassigned)
    setAssigneeSelection(task.assignedTo ?? "none");
    // initialize reviewer selection
    setSelectedReviewer(task.reviewer ?? "none");
    // initialize priority selection
    setSelectedPriority(task.priority ?? null);
  };

  // Load remarks when either the full task dialog or the remarks-only view is opened
  const currentRemarksTask = selectedTask ?? remarksOnlyTask;
  useEffect(() => {
    let mounted = true;
    const loadRemarks = async () => {
      if (!currentRemarksTask) return;
      setLoadingRemarks(true);
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        const taskId = parseInt(currentRemarksTask.id, 10);
        const resp = await remarkApi.getRemarksByTask(taskId, backendRole);
        if (!mounted) return;
        // Debug: log fetched remarks so we can inspect file_id presence
        // eslint-disable-next-line no-console
        console.debug("loaded remarks for task", { taskId, remarks: resp });
        setRemarks(resp || []);
      } catch (err) {
        console.error("Failed to load remarks", err);
        setRemarks([]);
      } finally {
        if (mounted) setLoadingRemarks(false);
      }
    };
    loadRemarks();
    return () => {
      mounted = false;
    };
  }, [currentRemarksTask, currentRole]);

  const submitRemark = async () => {
    const taskTarget = selectedTask ?? remarksOnlyTask;
    if (!taskTarget) return;
    if (!newComment && !newFile) {
      toast({
        title: "Nothing to submit",
        description: "Please add a comment or attach a file.",
      });
      return;
    }
    try {
      setSubmittingRemark(true);
      const backendRoleMap: { [k: string]: string } = {
        admin: "Admin",
        manager: "Manager",
        developer: "Developer",
      };
      const backendRole = backendRoleMap[currentRole] || "Developer";
      const taskId = parseInt(taskTarget.id, 10);
      await remarkApi.createRemark(taskId, newComment, newFile, backendRole);
      setNewComment("");
      setNewFile(null);
      // reload remarks for the current target
      const resp = await remarkApi.getRemarksByTask(taskId, backendRole);
      // Debug: log response after creating remark to verify returned file metadata
      // eslint-disable-next-line no-console
      console.debug("after create remark, fetched remarks", {
        taskId,
        remarks: resp,
      });
      setRemarks(resp || []);
      toast({ title: "Remark added", description: "Your remark was posted." });
    } catch (err: any) {
      console.error("Failed to post remark", err);
      toast({ title: "Failed to post remark", description: safeErrMsg(err) });
    } finally {
      setSubmittingRemark(false);
    }
  };

  // load file previews for any remarks that have file_id
  useEffect(() => {
    let mounted = true;
    const urls: Record<string, string> = {};
    const loaders: Array<Promise<void>> = [];
    for (const r of remarks || []) {
      if (r.file_id) {
        const fileId = String(r.file_id);
        if (!previewUrls[fileId]) {
          const load = (async () => {
            try {
              const resp = await api.get(`/file/${fileId}`, {
                responseType: "blob",
              });
              if (!mounted) return;
              const blob = resp.data as Blob;
              const url = URL.createObjectURL(blob);
              urls[fileId] = url;
            } catch (e) {
              // ignore failed preview
              // eslint-disable-next-line no-console
              console.warn("Failed to load file preview", fileId, e);
            }
          })();
          loaders.push(load);
        }
      }
    }

    Promise.all(loaders).then(() => {
      if (!mounted) return;
      setPreviewUrls((prev) => ({ ...prev, ...urls }));
    });

    return () => {
      mounted = false;
      // revoke created urls
      Object.values(urls).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch (e) {
          // ignore
        }
      });
    };
  }, [remarks]);

  // Open attachment: if we have a cached preview URL, use it; otherwise fetch on demand.
  const handleOpenAttachment = async (fileId: string, fileName?: string) => {
    try {
      // Debug: log attachment open attempts
      // eslint-disable-next-line no-console
      console.debug("handleOpenAttachment", {
        fileId,
        fileName,
        cached: !!previewUrls[fileId],
      });
      if (previewUrls[fileId]) {
        setImageModalUrl(previewUrls[fileId]);
        setImageModalAlt(fileName || "attachment");
        return;
      }
      // fetch blob
      const resp = await api.get(`/file/${fileId}`, { responseType: "blob" });
      const blob = resp.data as Blob;
      const url = URL.createObjectURL(blob);
      setPreviewUrls((prev) => ({ ...prev, [fileId]: url }));
      setImageModalUrl(url);
      setImageModalAlt(fileName || "attachment");
    } catch (err) {
      console.error("Failed to load attachment", fileId, err);
      toast({
        title: "Failed to load attachment",
        description: "Could not fetch the file.",
      });
    }
  };

  const handleAssign = async () => {
    try {
      if (!selectedTask) return;
      // diagnostic log
      // eslint-disable-next-line no-console
      console.debug("handleAssign start", { selectedTask, assigneeSelection });
      // map frontend role to backend role string
      const backendRoleMap: { [k: string]: string } = {
        admin: "Admin",
        manager: "Manager",
        developer: "Developer",
      };
      const backendRole = backendRoleMap[currentRole] || "Developer";

      try {
        const assigned_to =
          assigneeSelection && assigneeSelection !== "none"
            ? parseInt(assigneeSelection, 10)
            : undefined;

        // diagnostic
        // eslint-disable-next-line no-console
        console.debug("handleAssign assigned_to", { assigned_to });

        const payload: any = {};
        if (assigned_to !== undefined) payload.assigned_to = assigned_to;
        // set assigned_by to current manager and assigned_at timestamp
        if (user?.id) payload.assigned_by = parseInt(user.id, 10);
        payload.assigned_at = new Date().toISOString();

        // eslint-disable-next-line no-console
        console.debug("handleAssign payload", payload);
        // call backend
        // eslint-disable-next-line no-console
        console.debug("handleAssign calling updateTask", {
          id: selectedTask.id,
          backendRole,
        });
        await taskService.updateTask(
          parseInt(selectedTask.id, 10),
          payload,
          backendRole
        );
        // eslint-disable-next-line no-console
        console.debug("handleAssign updateTask success");
        // Refresh the single task from backend to ensure UI shows canonical state
        try {
          // backend get expects id query param
          const refreshed = await taskService.getTaskById(
            parseInt(selectedTask.id, 10)
          );
          const mapped = mapBackendTaskToFrontend(refreshed as any);
          // update local lists with refreshed task
          if (currentRole === "manager") {
            setAllTasks((prev) =>
              prev.map((t) => (t.id === mapped.id ? mapped : t))
            );
            setTasks((prev) =>
              prev.map((t) => (t.id === mapped.id ? mapped : t))
            );
          } else {
            setTasks((prev) =>
              prev.map((t) => (t.id === mapped.id ? mapped : t))
            );
          }
          // update employeeNames cache with resolved name
          if (mapped.assignedTo && !employeeNames[mapped.assignedTo]) {
            try {
              const backendRoleMap: { [k: string]: string } = {
                admin: "Admin",
                manager: "Manager",
                developer: "Developer",
              };
              const backendRole = backendRoleMap[currentRole] || "Developer";
              const emp = await employeeService.getEmployeeCached(
                parseInt(mapped.assignedTo, 10),
                backendRole
              );
              if (emp?.name)
                setEmployeeNames((s) => ({
                  ...s,
                  [mapped.assignedTo!]: emp.name,
                }));
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn("Failed to load assignee name", e);
            }
          }
        } catch (refreshErr) {
          // eslint-disable-next-line no-console
          console.warn("Failed to refresh task after assign", refreshErr);
        }

        // update local state
        const assignedToStr = assigned_to ? String(assigned_to) : undefined;
        if (currentRole === "manager") {
          setAllTasks((prev) =>
            prev.map((t) =>
              t.id === selectedTask.id
                ? {
                    ...t,
                    assignedTo: assignedToStr,
                    assignedBy: user?.id,
                    assignedAt: payload.assigned_at,
                  }
                : t
            )
          );
          setTasks((prev) =>
            prev.map((t) =>
              t.id === selectedTask.id
                ? {
                    ...t,
                    assignedTo: assignedToStr,
                    assignedBy: user?.id,
                    assignedAt: payload.assigned_at,
                  }
                : t
            )
          );
        } else {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === selectedTask.id
                ? {
                    ...t,
                    assignedTo: assignedToStr,
                    assignedBy: user?.id,
                    assignedAt: payload.assigned_at,
                  }
                : t
            )
          );
        }

        // update employeeNames cache for assigned user
        if (assignedToStr && !employeeNames[assignedToStr]) {
          const empName = managerEmployees.find(
            (e) => String(e.e_id) === assignedToStr
          )?.name;
          if (empName)
            setEmployeeNames((s) => ({ ...s, [assignedToStr]: empName }));
        }

        toast({ title: "Assigned", description: "Task assignment updated" });
        // notify parent to refresh stats/tasks
        try {
          onTasksUpdated?.();
        } catch (e) {
          // ignore
        }
        // close dialog
        setSelectedTask(null);
      } catch (err: any) {
        console.error("Failed to assign task", err);
        // show network/backend error but don't rethrow
        toast({
          title: "Assign Failed",
          description: safeErrMsg(err, "Failed to assign task"),
          variant: "destructive",
        });
      }
    } catch (outerErr) {
      // Catch any unexpected synchronous errors
      // eslint-disable-next-line no-console
      console.error("Unexpected error in handleAssign", outerErr);
      toast({
        title: "Assign Failed",
        description: safeErrMsg(outerErr, "Unexpected error"),
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      if (!selectedTask) return;
      const backendRoleMap: { [k: string]: string } = {
        admin: "Admin",
        manager: "Manager",
        developer: "Developer",
      };
      const backendRole = backendRoleMap[currentRole] || "Developer";

      const payload: any = {};

      // assigned_to
      const assigned_to =
        assigneeSelection && assigneeSelection !== "none"
          ? parseInt(assigneeSelection, 10)
          : undefined;
      if (assigned_to !== undefined) {
        payload.assigned_to = assigned_to;
        if (user?.id) payload.assigned_by = parseInt(user.id, 10);
        payload.assigned_at = new Date().toISOString();
      }

      // reviewer - only send if select present (may be 'none')
      const reviewer_to =
        selectedReviewer && selectedReviewer !== "none"
          ? parseInt(selectedReviewer, 10)
          : undefined;
      // Only include reviewer if the current UI allows editing it (admin OR manager who created)
      const canEditReviewer =
        currentRole === "admin" ||
        (currentRole === "manager" && selectedTask.createdBy === user?.id);
      if (canEditReviewer) payload.reviewer = reviewer_to;

      // priority - only allow change if creator and admin/manager
      const canEditPriority =
        (currentRole === "admin" || currentRole === "manager") &&
        selectedTask.createdBy === user?.id;
      if (canEditPriority && selectedPriority) {
        payload.priority = selectedPriority;
      }

      // nothing to update
      if (Object.keys(payload).length === 0) {
        toast({ title: "Nothing to save", description: "No changes detected" });
        return;
      }

      await taskService.updateTask(
        parseInt(selectedTask.id, 10),
        payload,
        backendRole
      );

      // refresh task
      try {
        const refreshed = await taskService.getTaskById(
          parseInt(selectedTask.id, 10)
        );
        const mapped = mapBackendTaskToFrontend(refreshed as any);
        if (currentRole === "manager") {
          setAllTasks((prev) =>
            prev.map((t) => (t.id === mapped.id ? mapped : t))
          );
          setTasks((prev) =>
            prev.map((t) => (t.id === mapped.id ? mapped : t))
          );
        } else {
          setTasks((prev) =>
            prev.map((t) => (t.id === mapped.id ? mapped : t))
          );
        }
        // update cache names for assigned/reviewer if present
        if (mapped.assignedTo && !employeeNames[mapped.assignedTo]) {
          try {
            const emp = await employeeService.getEmployeeCached(
              parseInt(mapped.assignedTo, 10),
              backendRole
            );
            if (emp?.name)
              setEmployeeNames((s) => ({
                ...s,
                [mapped.assignedTo!]: emp.name,
              }));
          } catch (e) {
            // ignore
          }
        }
        if (mapped.reviewer && !employeeNames[mapped.reviewer]) {
          try {
            const emp = await employeeService.getEmployeeCached(
              parseInt(mapped.reviewer, 10),
              backendRole
            );
            if (emp?.name)
              setEmployeeNames((s) => ({ ...s, [mapped.reviewer!]: emp.name }));
          } catch (e) {
            // ignore
          }
        }
      } catch (refreshErr) {
        // eslint-disable-next-line no-console
        console.warn("Failed to refresh task after save", refreshErr);
      }

      toast({ title: "Saved", description: "Task updated" });
      // notify parent to refresh stats/tasks
      try {
        onTasksUpdated?.();
      } catch (e) {
        // ignore
      }
      setSelectedTask(null);
    } catch (err: any) {
      console.error("Failed to save task details", err);
      toast({
        title: "Save Failed",
        description: safeErrMsg(err, "Failed to save"),
        variant: "destructive",
      });
    }
  };

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
    const task = (currentRole === "manager" ? allTasks : tasks).find(
      (t) => t.id === taskId
    );
    if (!task) return;

    // Validate status change based on role
    const canChange = validateStatusChange(
      task.status,
      newStatus,
      currentRole,
      user?.id,
      task
    );

    if (!canChange.allowed) {
      toast({
        title: "Action Not Allowed",
        description: canChange.reason,
        variant: "destructive",
      });
      return;
    }

    // Map frontend status to backend status values
    const frontToBackStatus: Record<TaskStatus, string> = {
      todo: "to_do",
      inprogress: "in_progress",
      review: "review",
      done: "done",
    };

    (async () => {
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";

        await taskService.updateTaskStatus(
          parseInt(task.id, 10),
          { status: frontToBackStatus[newStatus] as any },
          backendRole
        );

        // update local state on success
        const updatedAt = new Date().toISOString();
        if (currentRole === "manager") {
          setAllTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, status: newStatus, updatedAt } : t
            )
          );
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, status: newStatus, updatedAt } : t
            )
          );
        } else {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, status: newStatus, updatedAt } : t
            )
          );
        }

        toast({ title: "Task Moved", description: "Status updated" });
        // notify parent to refresh stats/tasks
        try {
          onTasksUpdated?.();
        } catch (e) {
          // ignore
        }
      } catch (err: any) {
        console.error("Failed to update task status", err);
        toast({
          title: "Update Failed",
          description: safeErrMsg(err, "Failed to update task status"),
          variant: "destructive",
        });
      }
    })();
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!selectedTask) return;
    // Status change validation based on role
    const canChange = validateStatusChange(
      selectedTask.status,
      newStatus,
      currentRole,
      user?.id,
      selectedTask
    );

    if (!canChange.allowed) {
      toast({
        title: "Action Not Allowed",
        description: canChange.reason,
        variant: "destructive",
      });
      return;
    }

    const frontToBackStatus: Record<TaskStatus, string> = {
      todo: "to_do",
      inprogress: "in_progress",
      review: "review",
      done: "done",
    };

    (async () => {
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";

        await taskService.updateTaskStatus(
          parseInt(selectedTask.id, 10),
          { status: frontToBackStatus[newStatus] as any },
          backendRole
        );

        const updatedAt = new Date().toISOString();
        if (currentRole === "manager") {
          setAllTasks((prev) =>
            prev.map((t) =>
              t.id === selectedTask.id
                ? { ...t, status: newStatus, updatedAt }
                : t
            )
          );
          setTasks((prev) =>
            prev.map((t) =>
              t.id === selectedTask.id
                ? { ...t, status: newStatus, updatedAt }
                : t
            )
          );
        } else {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === selectedTask.id
                ? { ...t, status: newStatus, updatedAt }
                : t
            )
          );
        }

        toast({
          title: "Status Updated",
          description: `Task ${
            selectedTask.id
          } moved to ${newStatus.toUpperCase()}`,
        });
        // notify parent to refresh stats/tasks
        try {
          onTasksUpdated?.();
        } catch (e) {
          // ignore
        }
        setSelectedTask(null);
      } catch (err: any) {
        console.error("Failed to patch task status", err);
        toast({
          title: "Update Failed",
          description: safeErrMsg(err, "Failed to update task status"),
          variant: "destructive",
        });
      }
    })();
  };

  const validateStatusChange = (
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
    role: string,
    userId?: string,
    task?: Task
  ): { allowed: boolean; reason?: string } => {
    // Developer: only allowed to move from In Progress -> Review
    if (role === "developer") {
      // Developers are allowed to move from To Do -> In Progress and In Progress -> Review
      if (
        (currentStatus === "inprogress" && newStatus === "review") ||
        (currentStatus === "todo" && newStatus === "inprogress")
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason:
          "Developers can only move tasks from To Do -> In Progress or In Progress -> Review",
      };
    }

    // Manager: only the manager who created the task OR the reviewer can change
    // a task from Review -> Done OR Review -> In Progress
    if (role === "manager") {
      if (
        currentStatus === "review" &&
        (newStatus === "done" || newStatus === "inprogress")
      ) {
        if (!task || !userId) {
          return {
            allowed: false,
            reason: "Insufficient context to validate manager action",
          };
        }
        const isCreator = task.createdBy === userId;
        const isReviewer = task.reviewer === userId;
        if (isCreator || isReviewer) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason:
            "Only the manager who created the task or the reviewer can change status from Review",
        };
      }
      // Other manager transitions are not allowed by this rule
      return {
        allowed: false,
        reason:
          "Managers can only change Review -> Done or Review -> In Progress for their tasks",
      };
    }

    // Admin: allow any change
    return { allowed: true };
  };

  const priorityColors: Record<Priority, string> = {
    high: "bg-priority-high/10 text-priority-high",
    medium: "bg-priority-medium/10 text-priority-medium",
    low: "bg-priority-low/10 text-priority-low",
  };

  const statusColors: Record<TaskStatus, string> = {
    todo: "bg-status-todo/10 text-status-todo",
    inprogress: "bg-status-inprogress/10 text-status-inprogress",
    review: "bg-status-review/10 text-status-review",
    done: "bg-status-done/10 text-status-done",
  };

  // Permission helpers for the dialog
  const canEditAssignee = currentRole === "manager" || currentRole === "admin";
  const canEditReviewer =
    currentRole === "admin" ||
    (currentRole === "manager" && selectedTask?.createdBy === user?.id);
  const canEditPriority =
    (currentRole === "admin" || currentRole === "manager") &&
    selectedTask?.createdBy === user?.id;
  const canSave = canEditAssignee || canEditReviewer || canEditPriority;

  return (
    <ErrorBoundary>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Task Board</h1>
            <p className="text-muted-foreground">
              Manage and track all tasks across the team
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select
              value={priorityFilter}
              onValueChange={(value) =>
                setPriorityFilter(value as Priority | "all")
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {/* Manager-specific task filters (moved from sidebar) */}
            {currentRole === "manager" && (
              <div className="flex items-center gap-2">
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === "created"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setViewMode("created")}
                >
                  Created
                </button>
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === "assigned"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setViewMode("assigned")}
                >
                  Assigned
                </button>
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === "reviewer"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setViewMode("reviewer")}
                >
                  Reviewer
                </button>
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === "all"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setViewMode("all")}
                >
                  All
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Board */}
          <div className="flex-1">
            <KanbanBoard
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onOpenRemarks={(t) => {
                // open remarks-only view
                setRemarksOnlyTask(t);
                setSelectedTask(null);
              }}
              onTaskMove={handleTaskMove}
            />
          </div>
        </div>

        {/* Task Detail Dialog */}
        <Dialog
          open={!!selectedTask}
          onOpenChange={() => setSelectedTask(null)}
        >
          <DialogContent className="max-w-lg">
            {selectedTask && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {selectedTask.id}
                    </Badge>
                    {/* If the current user (admin or manager) created the task, allow priority edit */}
                    {(currentRole === "admin" || currentRole === "manager") &&
                    selectedTask.createdBy === user?.id ? (
                      <div className="w-36">
                        <Select
                          value={selectedPriority ?? selectedTask.priority}
                          onValueChange={(v) =>
                            setSelectedPriority(v as Priority)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Badge className={priorityColors[selectedTask.priority]}>
                        {selectedTask.priority}
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-xl">
                    {selectedTask.title}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {selectedTask.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <Badge className={statusColors[selectedTask.status]}>
                      {selectedTask.status.replace("inprogress", "In Progress")}
                    </Badge>
                  </div>

                  {/* Assignee */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" /> Assigned To
                    </span>
                    <span className="text-sm font-medium">
                      {selectedTask.assignedTo
                        ? employeeNames[selectedTask.assignedTo] ??
                          `Employee ${selectedTask.assignedTo}`
                        : "Unassigned"}
                    </span>
                  </div>

                  {/* Reviewer */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Reviewer
                    </span>
                    {/* Show reviewer name for all roles; when editable (Admin or manager who created the task) show Select */}
                    {currentRole === "admin" ||
                    (currentRole === "manager" &&
                      selectedTask.createdBy === user?.id) ? (
                      <div className="w-48">
                        <Select
                          value={selectedReviewer ?? "none"}
                          onValueChange={(v) => setSelectedReviewer(v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select reviewer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {managerReviewers.map((m) => (
                              <SelectItem key={m.e_id} value={String(m.e_id)}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="text-sm font-medium">
                        {selectedTask.reviewer
                          ? employeeNames[selectedTask.reviewer] ??
                            `Employee ${selectedTask.reviewer}`
                          : "Unassigned"}
                      </span>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Due Date
                    </span>
                    <span className="text-sm font-medium">
                      {format(
                        new Date(selectedTask.expectedClosure),
                        "MMM d, yyyy"
                      )}
                    </span>
                  </div>

                  {/* Updated At */}
                  {selectedTask.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Last Updated
                      </span>
                      <span className="text-sm">
                        {format(
                          new Date(selectedTask.updatedAt),
                          "MMM d, yyyy HH:mm"
                        )}
                      </span>
                    </div>
                  )}

                  {/* Manager/Admin assign control */}
                  {(currentRole === "manager" || currentRole === "admin") && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" /> Assign To
                      </span>
                      <div className="w-48">
                        <Select
                          value={assigneeSelection ?? "none"}
                          onValueChange={(v) => setAssigneeSelection(v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {managerEmployees.map((e) => (
                              <SelectItem key={e.e_id} value={String(e.e_id)}>
                                {e.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Remarks removed from full task details; use the dedicated Remarks-only dialog */}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {canSave && (
                    <Button
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await handleSave();
                        } catch (err) {
                          // Catch any unexpected rejection from handler
                          // eslint-disable-next-line no-console
                          console.error("Save button wrapper error", err);
                          toast({
                            title: "Save Failed",
                            description:
                              (err as any)?.message || "Failed to save task",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="bg-primary"
                    >
                      Save
                    </Button>
                  )}
                  {selectedTask.status === "todo" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange("inprogress")}
                      className="bg-status-inprogress hover:bg-status-inprogress/90"
                    >
                      Start Progress
                    </Button>
                  )}
                  {selectedTask.status === "inprogress" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange("review")}
                      className="bg-status-review hover:bg-status-review/90"
                    >
                      Submit for Review
                    </Button>
                  )}
                  {selectedTask.status === "review" &&
                    currentRole !== "developer" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange("done")}
                          className="bg-status-done hover:bg-status-done/90"
                        >
                          Approve & Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange("inprogress")}
                        >
                          Request Changes
                        </Button>
                      </>
                    )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Remarks-only dialog (opened from message icon) */}
        <Dialog
          open={!!remarksOnlyTask}
          onOpenChange={() => setRemarksOnlyTask(null)}
        >
          <DialogContent className="max-w-md">
            {remarksOnlyTask && (
              <div className="space-y-3">
                <DialogHeader>
                  <DialogTitle className="text-lg">
                    Remarks for {remarksOnlyTask.id}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-2 max-h-80 overflow-auto">
                  {loadingRemarks && (
                    <div className="text-sm">Loading remarks...</div>
                  )}
                  {!loadingRemarks && remarks.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No remarks
                    </div>
                  )}
                  {remarks.map((r, idx) => (
                    <div
                      key={
                        (r && r._id && String(r._id)) ||
                        r.id ||
                        `remark-only-${idx}`
                      }
                      className="p-2 bg-muted/5 rounded"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm">{r.comment ?? r.content}</div>

                        <div className="flex items-center gap-2">
                          {r.file_id ? (
                            <button
                              type="button"
                              title={r.file_name || "View attachment"}
                              aria-label={
                                r.file_name
                                  ? `View ${r.file_name}`
                                  : "View attachment"
                              }
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleOpenAttachment(
                                  String(r.file_id),
                                  r.file_name
                                );
                              }}
                              className="p-1 rounded hover:bg-muted/10 text-primary"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {r.file_id && previewUrls[String(r.file_id)] && (
                        <div className="mt-2">
                          <img
                            src={previewUrls[String(r.file_id)]}
                            alt={r.file_name || "attachment"}
                            className="max-h-40 object-contain rounded cursor-zoom-in"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleOpenAttachment(
                                String(r.file_id),
                                r.file_name
                              );
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 space-y-2">
                  <textarea
                    className="w-full p-2 border rounded resize-none"
                    rows={3}
                    placeholder="Add a remark..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      onChange={(e) =>
                        setNewFile(e.target.files ? e.target.files[0] : null)
                      }
                    />
                    <Button
                      size="sm"
                      onClick={submitRemark}
                      disabled={submittingRemark}
                      className="bg-primary"
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image preview modal */}
        <Dialog
          open={!!imageModalUrl}
          onOpenChange={(open) => !open && setImageModalUrl(null)}
        >
          <DialogContent className="max-w-3xl p-0">
            {imageModalUrl && (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={imageModalUrl}
                  alt={imageModalAlt ?? "attachment"}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

export default TaskBoard;
