import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { taskService } from "@/services/taskService";
import { mapBackendTaskToFrontend } from "@/lib/utils";
import StatsCard from "@/components/dashboard/StatsCard";
import TaskBoard from "@/pages/TaskBoard";
import CreateTask from "@/pages/CreateTask";
import { employeeService } from "@/services/employeeService";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  ListTodo,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Task, TaskStatus } from "@/types";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [employeesCount, setEmployeesCount] = useState<number>(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  // Fetch the logged-in user's full name from backend employees table
  useEffect(() => {
    let mounted = true;
    const fetchEmployeeName = async () => {
      const userId = user?.id; // frontend User uses `id` (string)
      if (!userId) return;
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";

        const employee = await employeeService.getEmployeeById(
          parseInt(userId, 10),
          backendRole
        );
        if (mounted && employee?.name) {
          setEmployeeName(employee.name);
        }
      } catch (error) {
        console.error("Error fetching employee name:", error);
        if (mounted) setEmployeeName(user?.name || `User ${userId}`);
      }
    };

    // Fetch tasks for stats. Mirror TaskBoard behavior per role:
    // - developer: tasks assigned to that developer
    // - manager: tasks created by the manager OR where the manager is reviewer
    // - admin: all tasks
    const fetchMyTasks = async () => {
      if (!user?.id) return;
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        const e_id = parseInt(user.id, 10);

        if (currentRole === "developer") {
          // tasks assigned to this developer
          const backendTasks = await taskService.getMyTasks(e_id, backendRole);
          if (!mounted) return;
          const frontTasks = backendTasks.map(mapBackendTaskToFrontend);
          setTasks(frontTasks);
        } else if (currentRole === "manager") {
          // tasks where createdBy === manager OR reviewer === manager
          const tasksResp = await taskService.getTasks(
            1,
            1000,
            undefined,
            undefined,
            backendRole
          );
          const backendTasks = tasksResp.data || [];
          if (!mounted) return;
          const frontTasksAll = backendTasks.map(mapBackendTaskToFrontend);
          const myIdStr = String(e_id);
          const filtered = frontTasksAll.filter(
            (t) => t.createdBy === myIdStr || t.reviewer === myIdStr
          );
          setTasks(filtered);
        } else {
          // admin or other roles: show all tasks
          const tasksResp = await taskService.getTasks(
            1,
            1000,
            undefined,
            undefined,
            backendRole
          );
          const backendTasks = tasksResp.data || [];
          if (!mounted) return;
          const frontTasksAll = backendTasks.map(mapBackendTaskToFrontend);
          setTasks(frontTasksAll);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      }
    };

    fetchMyTasks();

    // If admin, fetch employees count
    const fetchEmployeesCount = async () => {
      if (currentRole !== "admin") return;
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        const resp = await employeeService.getEmployees(1, 1, backendRole);
        setEmployeesCount(resp.total || resp.data.length || 0);
      } catch (err) {
        console.error("Error fetching employees count", err);
      }
    };

    fetchEmployeesCount();

    fetchEmployeeName();

    // re-run when refreshCounter changes (triggered by child updates)
    // note: fetchMyTasks is already invoked above; including refreshCounter in deps
    // ensures parent re-fetches when TaskBoard signals an update
    // (we call fetchMyTasks again below via effect dependency)

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.name, currentRole, showCreateModal, refreshCounter]);
  // Calculate stats
  const totalTasks = tasks.length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;
  const inProgressTasks = tasks.filter((t) => t.status === "inprogress").length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const reviewTasks = tasks.filter((t) => t.status === "review").length;

  const handleTaskClick = (task: Task) => {
    toast({
      title: `Task: ${task.id}`,
      description: task.title,
    });
  };

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
          : task
      )
    );
    toast({
      title: "Task Moved",
      description: `Task moved to ${newStatus.replace(
        "inprogress",
        "In Progress"
      )}`,
    });
  };

  const stats = [
    {
      title: "Total Tasks",
      value: totalTasks,
      icon: ListTodo,
      color: "primary" as const,
      trend: { value: 12, isPositive: true },
    },
    {
      title: "In Progress",
      value: inProgressTasks,
      icon: Clock,
      color: "warning" as const,
    },
    {
      title: "In Review",
      value: reviewTasks,
      icon: AlertCircle,
      color: "danger" as const,
    },
    {
      title: "Completed",
      value: completedTasks,
      icon: CheckCircle2,
      color: "success" as const,
      trend: { value: 8, isPositive: true },
    },
  ];

  // Admin sees additional stats
  const adminStats =
    currentRole === "admin"
      ? [
          {
            title: "Total Employees",
            value: employeesCount,
            icon: Users,
            color: "default" as const,
          },
          {
            title: "Team Velocity",
            value: "94%",
            icon: TrendingUp,
            color: "success" as const,
            trend: { value: 5, isPositive: true },
          },
        ]
      : [];

  const displayStats = [...stats, ...adminStats];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {employeeName}!</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your tasks today.
          </p>
        </div>
        {(currentRole === "admin" || currentRole === "manager") && (
          <>
            <Button
              variant="gradient"
              className="gap-2"
              onClick={() => {
                if (currentRole === "manager") setShowCreateModal(true);
                else navigate("/create-task");
              }}
            >
              <ListTodo className="h-4 w-4" />
              Create Task
            </Button>

            {/* Create Task modal for managers */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogContent className="max-w-4xl h-[85vh] overflow-auto">
                <CreateTask
                  onClose={() => setShowCreateModal(false)}
                  hideHeader
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {displayStats.map((stat, index) => (
          <div
            key={stat.title}
            className={index >= 4 ? "sm:col-span-1" : ""}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <StatsCard {...stat} />
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <TaskBoard onTasksUpdated={() => setRefreshCounter((c) => c + 1)} />
    </div>
  );
};

export default Dashboard;
