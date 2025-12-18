import React, { useState } from "react";
import { Task, TaskStatus } from "@/types";
import TaskCard from "./TaskCard";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onOpenRemarks?: (task: Task) => void;
  remarkCounts?: Record<string, number>;
  onAddTask?: (status: TaskStatus) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
}

const columns: {
  id: TaskStatus;
  title: string;
  color: string;
  bgColor: string;
}[] = [
  {
    id: "todo",
    title: "To Do",
    color: "bg-status-todo",
    bgColor: "bg-status-todo/5 border-status-todo/20",
  },
  {
    id: "inprogress",
    title: "In Progress",
    color: "bg-status-inprogress",
    bgColor: "bg-status-inprogress/5 border-status-inprogress/20",
  },
  {
    id: "review",
    title: "Review",
    color: "bg-status-review",
    bgColor: "bg-status-review/5 border-status-review/20",
  },
  {
    id: "done",
    title: "Done",
    color: "bg-status-done",
    bgColor: "bg-status-done/5 border-status-done/20",
  },
];

// Sortable Task Card wrapper
const SortableTaskCard: React.FC<{
  task: Task;
  onClick?: () => void;
  onOpenRemarks?: () => void;
  remarkCount?: number;
}> = ({ task, onClick, onOpenRemarks, remarkCount }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none cursor-grab active:cursor-grabbing transition-all duration-200",
        isDragging && "opacity-50 scale-105 z-50"
      )}
    >
      <TaskCard
        task={task}
        onClick={onClick}
        onOpenRemarks={onOpenRemarks}
        remarkCount={remarkCount}
      />
    </div>
  );
};

// Droppable Column wrapper
const DroppableColumn: React.FC<{
  column: (typeof columns)[0];
  tasks: Task[];
  canCreateTask: boolean;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
  isOver?: boolean;
  onOpenRemarks?: (task: Task) => void;
  remarkCounts?: Record<string, number>;
}> = ({
  column,
  tasks,
  canCreateTask,
  onTaskClick,
  onAddTask,
  isOver,
  onOpenRemarks,
  remarkCounts,
}) => {
  const { setNodeRef, isOver: overDroppable } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border p-4 min-h-[500px] transition-all duration-300",
        column.bgColor,
        (isOver || overDroppable) &&
          "ring-2 ring-primary/50 bg-primary/5 scale-[1.02]"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full", column.color)} />
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        {canCreateTask && column.id === "todo" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddTask?.(column.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tasks */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 min-h-[100px]">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-fade-in"
            >
              <SortableTaskCard
                task={task}
                onClick={() => onTaskClick?.(task)}
                onOpenRemarks={() => onOpenRemarks?.(task)}
                remarkCount={remarkCounts ? remarkCounts[task.id] ?? 0 : 0}
              />
            </div>
          ))}

          {tasks.length === 0 && (
            <div
              className={cn(
                "text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg transition-colors",
                isOver ? "border-primary/50 bg-primary/5" : "border-transparent"
              )}
            >
              <p>{isOver ? "Drop here" : "No tasks"}</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskClick,
  onOpenRemarks,
  remarkCounts,
  onAddTask,
  onTaskMove,
}) => {
  const { currentRole } = useAuth();
  const canCreateTask = currentRole === "admin" || currentRole === "manager";
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId((over?.id as string) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverId(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // Find which column the task was dropped into
    const activeTask = tasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;

    // Check if dropped over another task
    const overTask = tasks.find((t) => t.id === overId);
    const targetStatus = overTask ? overTask.status : (overId as TaskStatus);

    // Only trigger if status changed
    if (
      columns.some((c) => c.id === targetStatus) &&
      activeTask.status !== targetStatus
    ) {
      onTaskMove?.(activeTaskId, targetStatus);
    }
  };

  const getColumnTasks = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {columns.map((column) => {
          const columnTasks = getColumnTasks(column.id);

          return (
            <DroppableColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              canCreateTask={canCreateTask}
              onTaskClick={onTaskClick}
              remarkCounts={remarkCounts}
              onOpenRemarks={onOpenRemarks}
              onAddTask={onAddTask}
              isOver={
                overId === column.id || columnTasks.some((t) => t.id === overId)
              }
            />
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 scale-105 opacity-90 shadow-2xl">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
