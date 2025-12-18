import React, { useEffect, useState } from "react";
import { Task, Priority, TaskStatus } from "@/types";
import { employeeService } from "@/services/employeeService";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays } from "date-fns";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onOpenRemarks?: () => void;
  remarkCount?: number;
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

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  onOpenRemarks,
  remarkCount,
}) => {
  const { currentRole } = useAuth();
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState<string | null>(null);

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

  // Load reviewer name (if any) for display
  useEffect(() => {
    let mounted = true;
    const loadReviewer = async () => {
      if (!task.reviewer) return;
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        const emp = await employeeService.getEmployeeCached(
          parseInt(String(task.reviewer), 10),
          backendRole
        );
        if (!mounted) return;
        setReviewerName(emp?.name || null);
      } catch (err) {
        console.error("Error loading reviewer", err);
      }
    };
    loadReviewer();
    return () => {
      mounted = false;
    };
  }, [task.reviewer, currentRole]);
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const highPriorityCardClass =
    task.priority === "high"
      ? "ring-2 ring-red-500/40 border-red-400 shadow-[0_10px_30px_rgba(239,68,68,0.12)] pulse-red-glow"
      : "";

  // Deadline highlighting
  const daysLeft = differenceInCalendarDays(
    new Date(task.expectedClosure),
    new Date()
  );
  let dueCardClass = "";
  let dueBadgeLabel: string | null = null;
  let dueBadgeClass = "text-xs";
  if (daysLeft < 0) {
    // overdue
    dueCardClass =
      "ring-2 ring-red-600/50 border-transparent shadow-[0_12px_36px_rgba(220,38,38,0.18)]";
    dueBadgeLabel = `Overdue ${Math.abs(daysLeft)}d`;
    dueBadgeClass = "bg-destructive/10 text-destructive border-destructive/20";
  } else if (daysLeft <= 2) {
    // within 2 days warning
    dueCardClass =
      "ring-2 ring-amber-400/40 border-transparent shadow-[0_8px_24px_rgba(245,158,11,0.12)]";
    dueBadgeLabel = `Due in ${daysLeft}d`;
    dueBadgeClass = "bg-amber-100 text-amber-700 border-amber-200";
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-card border border-border group animate-fade-in",
        highPriorityCardClass,
        dueCardClass
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
      <CardContent className="pt-0 space-y-3 px-4">
        <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {task.title}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-6 min-w-0">
          {/* Left: avatars (assignee, reviewer) */}
          <div className="flex items-center gap-3 flex-none">
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

            {reviewerName ? (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {reviewerName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-6 w-6" />
            )}
          </div>

          {/* Center: message icon with badge */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenRemarks) onOpenRemarks();
                else onClick?.();
              }}
              className="flex items-center justify-center text-muted-foreground hover:text-primary px-2"
              aria-label={
                typeof remarkCount === "number"
                  ? `${remarkCount} remarks`
                  : "0 remarks"
              }
            >
              <span className="relative inline-flex items-center">
                <MessageSquare className="h-4 w-4" />
                <span className="absolute top-0 right-0 transform translate-x-3 -translate-y-1/2 inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 rounded-full bg-destructive text-white text-[10px] leading-none">
                  {typeof remarkCount === "number" ? remarkCount : 0}
                </span>
              </span>
            </button>
          </div>

          {/* Right: due date and optional due badge */}
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground flex-none max-w-[45%]">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.expectedClosure), "MMM d")}</span>
              {dueBadgeLabel && (
                <Badge
                  variant="outline"
                  className={cn("ml-2 px-2 py-0.5 rounded-full", dueBadgeClass)}
                >
                  {dueBadgeLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
