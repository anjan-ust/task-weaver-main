import React, { useEffect, useState } from "react";
import { Task, Priority, TaskStatus } from "@/types";
import { employeeService } from "@/services/employeeService";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  high: {
    label: "High",
    className: "bg-priority-high/10 text-priority-high border-priority-high/20",
  },
  medium: {
    label: "Medium",
    className:
      "bg-priority-medium/10 text-priority-medium border-priority-medium/20",
  },
  low: {
    label: "Low",
    className: "bg-priority-low/10 text-priority-low border-priority-low/20",
  },
};

const statusConfig: Record<TaskStatus, { color: string }> = {
  todo: { color: "bg-status-todo" },
  inprogress: { color: "bg-status-inprogress" },
  review: { color: "bg-status-review" },
  done: { color: "bg-status-done" },
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const { currentRole } = useAuth();
  const [assigneeName, setAssigneeName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!task.assignedTo) return;
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        const emp = await employeeService.getEmployeeCached(
          parseInt(task.assignedTo, 10),
          backendRole
        );
        if (!mounted) return;
        setAssigneeName(emp?.name || null);
      } catch (err) {
        console.error("Error loading assignee", err);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [task.assignedTo, currentRole]);
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-card border border-border group animate-fade-in"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                status.color
              )}
            />
            <span className="text-xs text-muted-foreground font-mono">
              {task.id}
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn("text-xs flex-shrink-0", priority.className)}
          >
            {priority.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {task.title}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.expectedClosure), "MMM d")}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>0</span>
            </div>
          </div>

          {assigneeName ? (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {assigneeName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <User className="h-3 w-3 text-muted-foreground/50" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
