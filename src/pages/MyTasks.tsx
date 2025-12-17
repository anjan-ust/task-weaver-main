import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import TaskCard from "@/components/tasks/TaskCard";
import { taskService } from "@/services/taskService";
import { mapBackendTaskToFrontend } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const MyTasks: React.FC = () => {
  const { user, currentRole } = useAuth();
  const [tasks, setTasks] = useState<any[]>([] as any[]);
  const { toast } = useToast();
  useEffect(() => {
    let mounted = true;
    const load = async () => {
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
        setTasks(backendTasks.map(mapBackendTaskToFrontend));
      } catch (err) {
        console.error("Error loading my tasks", err);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [user?.id, currentRole]);

  // Filter tasks assigned to current user (tasks is already per-user)
  const myTasks = tasks;
  const todoTasks = myTasks.filter((t) => t.status === "todo");
  const inProgressTasks = myTasks.filter((t) => t.status === "inprogress");
  const reviewTasks = myTasks.filter((t) => t.status === "review");
  const doneTasks = myTasks.filter((t) => t.status === "done");

  const handleTaskClick = (taskId: string, title: string) => {
    toast({
      title: `Task: ${taskId}`,
      description: title,
    });
  };

  const tabs = [
    { id: "all", label: "All", tasks: myTasks },
    { id: "todo", label: "To Do", tasks: todoTasks },
    { id: "inprogress", label: "In Progress", tasks: inProgressTasks },
    { id: "review", label: "Review", tasks: reviewTasks },
    { id: "done", label: "Done", tasks: doneTasks },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <p className="text-muted-foreground">
          Tasks assigned to you ({myTasks.length} total)
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0 mb-6">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2"
            >
              {tab.label}
              <Badge
                variant="secondary"
                className="ml-2 data-[state=active]:bg-primary-foreground/20"
              >
                {tab.tasks.length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            {tab.tasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tab.tasks.map((task, index) => (
                  <div
                    key={task.id}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className="animate-fade-in"
                  >
                    <TaskCard
                      task={task}
                      onClick={() => handleTaskClick(task.id, task.title)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tasks in this category</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default MyTasks;
