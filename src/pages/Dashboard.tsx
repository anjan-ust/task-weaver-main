import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { taskService } from "@/services/taskService";
import { mapBackendTaskToFrontend } from "@/lib/utils";
import StatsCard from "@/components/dashboard/StatsCard";
import KanbanBoard from "@/components/tasks/KanbanBoard";
import { employeeService } from "@/services/employeeService";

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

    // Fetch tasks assigned to the logged-in user
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
        const backendTasks = await taskService.getMyTasks(e_id, backendRole);
        if (!mounted) return;
        const frontTasks = backendTasks.map(mapBackendTaskToFrontend);
        setTasks(frontTasks);
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

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.name]);
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
          <Button
            variant="gradient"
            className="gap-2"
            onClick={() => navigate("/create-task")}
          >
            <ListTodo className="h-4 w-4" />
            Create Task
          </Button>
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
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Task Board</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {tasks.length} tasks
            </span>
          </div>
        </div>
        <KanbanBoard
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onTaskMove={handleTaskMove}
        />
      </div>
    </div>
  );
};

export default Dashboard;
