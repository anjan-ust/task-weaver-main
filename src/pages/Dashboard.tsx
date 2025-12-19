import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { taskService } from "@/services/taskService";
import { mapBackendTaskToFrontend } from "@/lib/utils";
import StatsCard from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  PieChart,
  Pie,
} from "recharts";
// Kanban/TaskBoard is commented out for the analytics-focused dashboard view.
// import TaskBoard from "@/pages/TaskBoard";
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
  BarChart2,
  PieChart as LucidePieChart,
  Clipboard,
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

  // Tooltip state for analytics bars
  const [barTooltip, setBarTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: number;
    percent: number;
  }>({ visible: false, x: 0, y: 0, label: "", value: 0, percent: 0 });

  // Hovered bar id for visual highlight
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // Generic chart tooltip renderer for Recharts
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0];
    const title = label || data.name || "";
    const value = data.value ?? 0;
    return (
      <div
        role="tooltip"
        className="p-2 bg-card border rounded shadow-md text-sm"
        style={{ pointerEvents: "none" }}
      >
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{value} tasks</div>
      </div>
    );
  };
  // Cached employees for recent tasks / team members
  const [employeeMap, setEmployeeMap] = useState<
    Record<string, { name: string }>
  >({});
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

  // Prepare chart and list data derived from `tasks`
  const barChartData = [
    { name: "To Do", value: todoTasks, color: "#3C83F6" },
    { name: "In Progress", value: inProgressTasks, color: "#F59E0B" },
    { name: "Review", value: reviewTasks, color: "#3C83F6" },
    { name: "Done", value: completedTasks, color: "#10B981" },
  ];

  const priorityCounts = tasks.reduce(
    (acc, t) => {
      const p = t.priority || "low";
      if (p === "high") acc.high += 1;
      else if (p === "medium") acc.medium += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  const pieChartData = [
    // Bright colors for priority: red for High, yellow for Medium, muted gray for Low
    { name: "High", value: priorityCounts.high, color: "#EF4444" },
    { name: "Medium", value: priorityCounts.medium, color: "#F59E0B" },
    { name: "Low", value: priorityCounts.low, color: "#D1D5DB" },
  ];

  // Recent tasks (sorted by updatedAt desc)
  const recentTasks = [...tasks]
    .sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5);

  // Team members derived from cached employees (or placeholder list)
  const teamMembers = Object.values(employeeMap).slice(0, 6);

  // Prefetch employee names used in tasks (assignedTo / reviewer)
  useEffect(() => {
    let mounted = true;
    const fetchEmployees = async () => {
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";

        const ids = Array.from(
          new Set(
            tasks
              .map((t) => t.assignedTo || t.reviewer)
              .filter(Boolean)
              .map((id) => String(id))
          )
        );

        await Promise.all(
          ids.map(async (id) => {
            if (!mounted) return;
            if (employeeMap[id]) return;
            try {
              const emp = await employeeService.getEmployeeCached(
                parseInt(id, 10),
                backendRole
              );
              if (!mounted) return;
              setEmployeeMap((m) => ({ ...m, [id]: { name: emp.name } }));
            } catch (e) {
              // ignore missing employee
            }
          })
        );
      } catch (e) {
        // ignore
      }
    };

    if (tasks.length) fetchEmployees();
    return () => {
      mounted = false;
    };
  }, [tasks, currentRole]);

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Distribution Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" /> Task Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip content={ChartTooltip} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        style={{ cursor: "pointer" }}
                        fillOpacity={activeBarIndex === index ? 0.95 : 1}
                        stroke={
                          activeBarIndex === index
                            ? "rgba(0,0,0,0.08)"
                            : undefined
                        }
                        onMouseEnter={() => setActiveBarIndex(index)}
                        onMouseLeave={() => setActiveBarIndex(null)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority Breakdown Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <LucidePieChart className="h-4 w-4 text-primary" /> Priority
              Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between h-[200px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          style={{ cursor: "pointer" }}
                          fillOpacity={activePieIndex === index ? 1 : 0.8}
                          stroke={
                            activePieIndex === index
                              ? "rgba(0,0,0,0.06)"
                              : undefined
                          }
                          onMouseEnter={() => setActivePieIndex(index)}
                          onMouseLeave={() => setActivePieIndex(null)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={ChartTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3">
                {pieChartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="text-sm font-semibold ml-auto">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clipboard className="h-4 w-4 text-primary" /> Recent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.map((task) => {
              const assignee = task.assignedTo
                ? employeeMap[String(task.assignedTo)]
                : null;
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignee?.name || "Unassigned"}
                    </p>
                  </div>
                  <Badge
                    className={`${
                      task.priority === "high"
                        ? "bg-red-100 text-red-600"
                        : task.priority === "medium"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-gray-100 text-muted-foreground"
                    } text-xs uppercase ml-2`}
                  >
                    {task.priority}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {teamMembers.length ? (
                teamMembers.map((employee, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {employee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {employee.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Employee
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No members to show
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
