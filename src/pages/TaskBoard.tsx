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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Calendar,
  User,
  MessageSquare,
  Clock,
} from "lucide-react";

const TaskBoard: React.FC = () => {
  const { currentRole, user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
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
      } catch (err: any) {
        console.error("Failed to update task status", err);
        toast({
          title: "Update Failed",
          description:
            err?.response?.data?.detail || "Failed to update task status",
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
        setSelectedTask(null);
      } catch (err: any) {
        console.error("Failed to patch task status", err);
        toast({
          title: "Update Failed",
          description:
            err?.response?.data?.detail || "Failed to update task status",
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

  return (
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
        <div className="flex flex-col sm:flex-row gap-3">
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
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar for manager view modes */}
        {currentRole === "manager" && (
          <aside className="w-48">
            <div className="space-y-2">
              <button
                className={`w-full text-left px-3 py-2 rounded ${
                  viewMode === "created"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewMode("created")}
              >
                Created Tasks
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded ${
                  viewMode === "assigned"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewMode("assigned")}
              >
                Assigned Tasks
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded ${
                  viewMode === "reviewer"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewMode("reviewer")}
              >
                Reviewer Tasks
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded ${
                  viewMode === "all"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewMode("all")}
              >
                All Tasks
              </button>
            </div>
          </aside>
        )}

        {/* Board */}
        <div className="flex-1">
          <KanbanBoard
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onTaskMove={handleTaskMove}
          />
        </div>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-lg">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedTask.id}
                  </Badge>
                  <Badge className={priorityColors[selectedTask.priority]}>
                    {selectedTask.priority}
                  </Badge>
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
                  <span className="text-sm text-muted-foreground">Status</span>
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
                      ? employeeNames[selectedTask.assignedTo] || "Loading..."
                      : "Unassigned"}
                  </span>
                </div>

                {/* Reviewer */}
                {selectedTask.reviewer && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Reviewer
                    </span>
                    <span className="text-sm font-medium">
                      {employeeNames[selectedTask.reviewer] || "Loading..."}
                    </span>
                  </div>
                )}

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
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
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
    </div>
  );
};

export default TaskBoard;
