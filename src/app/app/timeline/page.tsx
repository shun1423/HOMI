"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import {
  Kanban,
  ChartBar,
  Plus,
  User,
  CalendarBlank,
  Clock,
  CheckCircle,
  Hourglass,
  Trash,
  Funnel,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  pointerWithin,
  rectIntersection,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useContractors,
  useProject,
  queryKeys,
} from "@/lib/queries";
import type { Task, TaskStatus } from "@/types/database";
import { USER_MAP } from "@/lib/constants";

// --- Constants ---

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "대기" },
  { value: "in_progress", label: "진행중" },
  { value: "done", label: "완료" },
];

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string; icon: typeof CheckCircle }
> = {
  todo: {
    label: "대기",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    icon: Hourglass,
  },
  in_progress: {
    label: "진행중",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    icon: Clock,
  },
  done: {
    label: "완료",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: CheckCircle,
  },
};

const GANTT_COLORS: Record<TaskStatus, string> = {
  todo: "bg-amber-400/80",
  in_progress: "bg-blue-500",
  done: "bg-emerald-500",
};

type AssigneeFilter = "all" | "성훈" | "태수" | "none";

// --- Helpers ---

function getUserName(id: string | null) {
  if (!id) return null;
  return USER_MAP[id] ?? "알 수 없음";
}

// --- Task Form Dialog ---

function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultStatus,
  tasks,
  contractors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultStatus?: TaskStatus;
  tasks: Task[];
  contractors: { id: string; name: string }[];
}) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? "");
  const [contractorId, setContractorId] = useState(task?.contractor_id ?? "");
  const [startDate, setStartDate] = useState(task?.start_date ?? "");
  const [endDate, setEndDate] = useState(task?.end_date ?? "");
  const [dependsOn, setDependsOn] = useState(task?.depends_on ?? "");
  const [parentTaskId, setParentTaskId] = useState(task?.parent_task_id ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus ?? "todo");

  const isEditing = !!task;
  const isPending = createTask.isPending || updateTask.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      assignee_id: assigneeId || null,
      contractor_id: contractorId || null,
      start_date: startDate || null,
      end_date: endDate || null,
      depends_on: dependsOn || null,
      parent_task_id: parentTaskId || null,
    };

    payload.status = status;

    if (isEditing) {
      updateTask.mutate(
        { id: task.id, ...payload } as Parameters<typeof updateTask.mutate>[0],
        {
          onSuccess: () => {
            toast.success("작업이 수정되었습니다");
            onOpenChange(false);
          },
          onError: () => toast.error("수정 실패"),
        }
      );
    } else {
      createTask.mutate(payload as Parameters<typeof createTask.mutate>[0], {
        onSuccess: () => {
          toast.success("작업이 추가되었습니다");
          onOpenChange(false);
        },
        onError: () => toast.error("추가 실패"),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "작업 수정" : "작업 추가"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "작업 정보를 수정합니다." : "새 작업을 추가합니다."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">제목 *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="작업 제목"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">설명</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="작업 설명 (선택)"
              rows={2}
            />
          </div>

          {/* Status selector */}
          <div className="space-y-1.5">
            <Label>상태</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>담당자</Label>
              <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">미정</SelectItem>
                  {Object.entries(USER_MAP).map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>시공사</Label>
              <Select value={contractorId} onValueChange={(v) => setContractorId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">미정</SelectItem>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start">시작일</Label>
              <Input
                id="task-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-end">종료일</Label>
              <Input
                id="task-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>선행 작업</Label>
            <Select value={dependsOn} onValueChange={(v) => setDependsOn(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="없음" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">없음</SelectItem>
                {tasks
                  .filter((t) => t.id !== task?.id)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>상위 작업</Label>
            <Select value={parentTaskId} onValueChange={(v) => setParentTaskId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="없음" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">없음</SelectItem>
                {tasks
                  .filter((t) => t.id !== task?.id && !t.parent_task_id)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* TODO: board_item_id link — requires adding board_item_id column to tasks table */}

          <DialogFooter className={isEditing ? "flex justify-between sm:justify-between" : ""}>
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (!confirm("이 작업을 삭제하시겠습니까?")) return;
                  deleteTask.mutate(task.id, {
                    onSuccess: () => {
                      toast.success("작업이 삭제되었습니다");
                      onOpenChange(false);
                    },
                    onError: () => toast.error("삭제 실패"),
                  });
                }}
              >
                <Trash weight="duotone" className="size-4" />
                삭제
              </Button>
            )}
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "저장 중..." : isEditing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Sortable Task Card ---

function SortableTaskCard({
  task,
  tasks,
  contractors,
  onEdit,
}: {
  task: Task;
  tasks: Task[];
  contractors: { id: string; name: string }[];
  onEdit: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    transition: {
      duration: 200,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing touch-none"
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        tasks={tasks}
        contractors={contractors}
        onEdit={onEdit}
      />
    </div>
  );
}

// --- Task Card ---

function TaskCard({
  task,
  tasks,
  contractors,
  onEdit,
  isOverlay,
}: {
  task: Task;
  tasks: Task[];
  contractors: { id: string; name: string }[];
  onEdit: (task: Task) => void;
  isOverlay?: boolean;
}) {
  const config = STATUS_CONFIG[task.status];
  const assigneeName = getUserName(task.assignee_id);
  const isChild = !!task.parent_task_id;

  return (
    <div className={isChild ? "ml-4" : ""}>
      <Card
        size="sm"
        className={`transition-shadow select-none ${isOverlay ? "shadow-lg ring-1 ring-primary/20" : "hover:ring-1 hover:ring-foreground/10"}`}
      >
        <CardContent
          className="space-y-1.5 cursor-pointer"
          onClick={() => onEdit(task)}
          onPointerDown={(e) => {
            // Allow card click but don't interfere with drag
            // stopPropagation only for actual clicks, not drags
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm leading-snug min-w-0 truncate">{task.title}</h4>
            <div className={`size-2 rounded-full shrink-0 mt-1.5 ${config.color.replace("text-", "bg-")}`} />
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {assigneeName && (
              <span className="flex items-center gap-1">
                <User weight="duotone" className="size-3" />
                {assigneeName}
              </span>
            )}
            {(task.start_date || task.end_date) && (
              <span className="flex items-center gap-1">
                <CalendarBlank weight="duotone" className="size-3" />
                {task.start_date?.slice(5) ?? "?"}~{task.end_date?.slice(5) ?? "?"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Kanban Column ---

function KanbanColumn({
  status,
  tasks,
  allTasks,
  contractors,
  onEdit,
  onQuickAdd,
  isOver,
}: {
  status: TaskStatus;
  tasks: Task[];
  allTasks: Task[];
  contractors: { id: string; name: string }[];
  onEdit: (task: Task) => void;
  onQuickAdd: (title: string, status: TaskStatus) => void;
  isOver: boolean;
}) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef } = useDroppable({ id: `column-${status}` });
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const taskIds = tasks.map((t) => t.id);

  function handleSubmitQuickAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onQuickAdd(trimmed, status);
    setNewTitle("");
    setAdding(false);
  }

  return (
    <div className="flex-1 min-w-[260px]" ref={setNodeRef}>
      <div
        className={`rounded-lg p-3 transition-colors duration-150 ${config.bgColor} ${isOver ? "ring-2 ring-primary/30" : ""}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm ${config.color}`}>
              {config.label}
            </h3>
            <span className="text-xs text-muted-foreground bg-background/60 rounded-full px-2 py-0.5">
              {tasks.length}
            </span>
          </div>
        </div>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 min-h-[60px]">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                tasks={allTasks}
                contractors={contractors}
                onEdit={onEdit}
              />
            ))}
            {tasks.length === 0 && !adding && (
              <p className="text-xs text-muted-foreground text-center py-4">
                작업 없음
              </p>
            )}
          </div>
        </SortableContext>

        {/* Quick add */}
        {adding ? (
          <div className="mt-2" onPointerDown={(e) => e.stopPropagation()}>
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitQuickAdd();
                if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
              }}
              placeholder="작업 제목 입력"
              className="h-8 text-xs"
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              <Button size="sm" className="h-6 text-[11px] px-2" onClick={handleSubmitQuickAdd}>
                추가
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => { setAdding(false); setNewTitle(""); }}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-2 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          >
            <Plus size={14} />
            추가
          </button>
        )}
      </div>
    </div>
  );
}

// --- Kanban View ---

function KanbanView({
  tasks: serverTasks,
  contractors,
  onEdit,
  onAdd,
}: {
  tasks: Task[];
  contractors: { id: string; name: string }[];
  onEdit: (task: Task) => void;
  onAdd: () => void;
}) {
  const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const queryClient = useQueryClient();

  // Local state for smooth drag interactions
  const [localTasks, setLocalTasks] = useState<Task[]>(serverTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  // Sync server → local when not dragging
  useEffect(() => {
    if (!activeTask) setLocalTasks(serverTasks);
  }, [serverTasks, activeTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  // Find which column a task or column-id belongs to
  function findColumn(id: string): TaskStatus | null {
    for (const s of STATUSES) {
      if (id === `column-${s}`) return s;
    }
    const task = localTasks.find((t) => t.id === id);
    return task?.status ?? null;
  }

  // Get ordered tasks for a column
  function getColumnTasks(status: TaskStatus): Task[] {
    return localTasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  const collisionDetection: CollisionDetection = useCallback((args) => {
    // First check if pointer is within any droppable
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) {
      // If over a sortable card, prefer that (for insertion point)
      const cardHit = pointerHits.find(
        (c) => !(c.id as string).startsWith("column-")
      );
      if (cardHit) return [cardHit];
      return pointerHits;
    }
    // Fallback: rect intersection for column detection
    const rectHits = rectIntersection(args);
    if (rectHits.length > 0) return rectHits;
    return closestCenter(args);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const task = localTasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      setOverColumn(task.status);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const fromCol = findColumn(activeId);
    const toCol = findColumn(overId);
    if (!fromCol || !toCol) return;

    setOverColumn(toCol);

    // Moving to a different column
    if (fromCol !== toCol) {
      setLocalTasks((prev) => {
        const fromTasks = prev
          .filter((t) => t.status === fromCol && t.id !== activeId)
          .sort((a, b) => a.sort_order - b.sort_order);
        const toTasks = prev
          .filter((t) => t.status === toCol)
          .sort((a, b) => a.sort_order - b.sort_order);
        const draggedTask = prev.find((t) => t.id === activeId);
        if (!draggedTask) return prev;

        // Find insertion index
        const overTask = toTasks.find((t) => t.id === overId);
        let insertIdx = toTasks.length;
        if (overTask) {
          insertIdx = toTasks.indexOf(overTask);
        }

        const newToTasks = [...toTasks];
        newToTasks.splice(insertIdx, 0, { ...draggedTask, status: toCol });

        const others = prev.filter(
          (t) => t.status !== fromCol && t.status !== toCol
        );
        return [
          ...others,
          ...fromTasks.map((t, i) => ({ ...t, sort_order: i })),
          ...newToTasks.map((t, i) => ({ ...t, sort_order: i })),
        ];
      });
    } else {
      // Same column reorder
      const overTask = localTasks.find((t) => t.id === overId);
      if (!overTask || activeId === overId) return;

      setLocalTasks((prev) => {
        const colTasks = prev
          .filter((t) => t.status === fromCol)
          .sort((a, b) => a.sort_order - b.sort_order);
        const oldIdx = colTasks.findIndex((t) => t.id === activeId);
        const newIdx = colTasks.findIndex((t) => t.id === overId);
        if (oldIdx === -1 || newIdx === -1) return prev;

        const reordered = arrayMove(colTasks, oldIdx, newIdx).map((t, i) => ({
          ...t,
          sort_order: i,
        }));
        const others = prev.filter((t) => t.status !== fromCol);
        return [...others, ...reordered];
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);

    if (!over) {
      setLocalTasks(serverTasks);
      return;
    }

    const activeId = active.id as string;
    const finalTasks = localTasks;
    const draggedTask = finalTasks.find((t) => t.id === activeId);
    const originalTask = serverTasks.find((t) => t.id === activeId);
    if (!draggedTask || !originalTask) return;

    // Persist status change
    if (draggedTask.status !== originalTask.status) {
      updateTask.mutate(
        { id: activeId, status: draggedTask.status },
        {
          onError: () => {
            toast.error("상태 변경 실패");
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
          },
        }
      );
    }

    // Persist sort order changes
    const affectedCol = draggedTask.status;
    const colTasks = finalTasks
      .filter((t) => t.status === affectedCol)
      .sort((a, b) => a.sort_order - b.sort_order);

    colTasks.forEach((task, index) => {
      const orig = serverTasks.find((t) => t.id === task.id);
      if (orig && (orig.sort_order !== index || orig.status !== affectedCol)) {
        updateTask.mutate({ id: task.id, sort_order: index });
      }
    });

    // Also fix sort_order in the column the card left
    if (draggedTask.status !== originalTask.status) {
      const oldColTasks = finalTasks
        .filter((t) => t.status === originalTask.status)
        .sort((a, b) => a.sort_order - b.sort_order);
      oldColTasks.forEach((task, index) => {
        const orig = serverTasks.find((t) => t.id === task.id);
        if (orig && orig.sort_order !== index) {
          updateTask.mutate({ id: task.id, sort_order: index });
        }
      });
    }

    // Optimistic: push local state into query cache
    queryClient.setQueryData<Task[]>(queryKeys.tasks, finalTasks);
  }

  function handleDragCancel() {
    setActiveTask(null);
    setOverColumn(null);
    setLocalTasks(serverTasks);
  }

  function handleQuickAdd(title: string, status: TaskStatus) {
    createTask.mutate(
      { title, status } as Parameters<typeof createTask.mutate>[0],
      {
        onSuccess: () => toast.success("작업이 추가되었습니다"),
        onError: () => toast.error("추가 실패"),
      }
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getColumnTasks(status)}
            allTasks={localTasks}
            contractors={contractors}
            onEdit={onEdit}
            onQuickAdd={handleQuickAdd}
            isOver={overColumn === status && activeTask?.status !== status}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
        duration: 200,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      }}>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            tasks={localTasks}
            contractors={contractors}
            onEdit={() => {}}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- Timeline View ---

function TimelineView({
  tasks,
  onEdit,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
}) {
  // Find date range from tasks
  const tasksWithDates = tasks.filter((t) => t.start_date && t.end_date);

  const dateRange = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return { start, end };
    }
    const starts = tasksWithDates.map((t) => new Date(t.start_date!).getTime());
    const ends = tasksWithDates.map((t) => new Date(t.end_date!).getTime());
    const minDate = new Date(Math.min(...starts));
    const maxDate = new Date(Math.max(...ends));
    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
    return { start: minDate, end: maxDate };
  }, [tasksWithDates]);

  const totalDays = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );

  const weeks = useMemo(() => {
    const result: { label: string; position: number }[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const daysSinceStart = (current.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
      const month = current.getMonth() + 1;
      const day = current.getDate();
      result.push({ label: `${month}/${day}`, position: (daysSinceStart / totalDays) * 100 });
      current.setDate(current.getDate() + 7);
    }
    return result;
  }, [dateRange, totalDays]);

  // Month headers
  const months = useMemo(() => {
    const result: { label: string; left: number; width: number }[] = [];
    const current = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), 1);
    while (current <= dateRange.end) {
      const monthStart = Math.max(current.getTime(), dateRange.start.getTime());
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      const monthEnd = Math.min(nextMonth.getTime(), dateRange.end.getTime());
      const left = ((monthStart - dateRange.start.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
      const width = ((monthEnd - monthStart) / (1000 * 60 * 60 * 24) / totalDays) * 100;
      result.push({ label: `${current.getFullYear()}년 ${current.getMonth() + 1}월`, left, width });
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }, [dateRange, totalDays]);

  const tasksWithoutDates = tasks.filter((t) => !t.start_date || !t.end_date);

  // Today line position
  const todayPosition = useMemo(() => {
    const now = new Date();
    const daysSinceStart = (now.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceStart < 0 || daysSinceStart > totalDays) return null;
    return (daysSinceStart / totalDays) * 100;
  }, [dateRange, totalDays]);

  function getBarPosition(taskStart: string, taskEnd: string) {
    const s = new Date(taskStart);
    const e = new Date(taskEnd);
    const leftDays = Math.max(
      0,
      (s.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const widthDays = Math.ceil(
      (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)
    );
    const left = (leftDays / totalDays) * 100;
    const width = (widthDays / totalDays) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ChartBar
            weight="duotone"
            className="size-10 text-muted-foreground/40 mx-auto mb-3"
          />
          <p className="text-sm text-muted-foreground">
            날짜가 설정된 작업이 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Month headers */}
            <div className="flex border-b">
              <div className="w-[180px] shrink-0" />
              <div className="flex-1 relative h-6">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full text-[10px] font-semibold text-muted-foreground flex items-center border-l border-foreground/10 pl-1.5"
                    style={{ left: `${m.left}%`, width: `${m.width}%` }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
            {/* Week headers */}
            <div className="flex border-b pb-1.5 pt-1">
              <div className="w-[180px] shrink-0 text-xs font-medium text-muted-foreground pr-3">
                작업명
              </div>
              <div className="flex-1 relative h-4">
                {weeks.map((week, i) => (
                  <div
                    key={i}
                    className="text-[9px] text-muted-foreground/60 absolute"
                    style={{ left: `${week.position}%` }}
                  >
                    {week.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {tasks.map((task, index) => {
              if (!task.start_date || !task.end_date) return null;
              const pos = getBarPosition(task.start_date, task.end_date);
              const config = STATUS_CONFIG[task.status];
              const assigneeName = getUserName(task.assignee_id);

              return (
                <div
                  key={task.id}
                  className="flex items-center h-9 border-b border-foreground/5 last:border-0 group"
                >
                  <div className="w-[180px] shrink-0 pr-3 flex items-center gap-2">
                    <div className={`size-1.5 rounded-full shrink-0 ${config.color.replace("text-", "bg-")}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{task.title}</div>
                    </div>
                    {assigneeName && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{assigneeName}</span>
                    )}
                  </div>
                  <div className="flex-1 relative h-full">
                    {/* Grid lines */}
                    {weeks.map((week, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-foreground/[0.04]"
                        style={{ left: `${week.position}%` }}
                      />
                    ))}

                    {/* Today line */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-400/60 z-10"
                        style={{ left: `${todayPosition}%` }}
                      >
                        {index === 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-red-500 whitespace-nowrap">
                            오늘
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      className={`absolute top-1.5 h-6 rounded-md ${GANTT_COLORS[task.status]} cursor-pointer hover:brightness-110 transition-all flex items-center overflow-hidden`}
                      style={{ left: pos.left, width: pos.width }}
                      onClick={() => onEdit(task)}
                    >
                      <span className="text-[10px] text-white font-medium px-2 truncate">
                        {task.title}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t">
            {(["todo", "in_progress", "done"] as TaskStatus[]).map(
              (status) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div
                    className={`size-2.5 rounded-sm ${GANTT_COLORS[status]}`}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {STATUS_CONFIG[status].label}
                  </span>
                </div>
              )
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-px bg-red-500" />
              <span className="text-[11px] text-muted-foreground">오늘</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unscheduled tasks */}
      {tasksWithoutDates.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            날짜 미설정 ({tasksWithoutDates.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {tasksWithoutDates.map((task) => {
              const config = STATUS_CONFIG[task.status];
              return (
                <button
                  key={task.id}
                  onClick={() => onEdit(task)}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                >
                  <div className={`size-1.5 rounded-full ${config.color.replace("text-", "bg-")}`} />
                  {task.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// --- Loading Skeleton ---

function TimelineSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-44 mt-1" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-3">
        {[0, 1, 2].map((col) => (
          <div key={col} className="flex-1 space-y-2">
            <Skeleton className="h-8 rounded-lg" />
            {[0, 1].map((row) => (
              <Skeleton key={row} className="h-28 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Page ---

export default function TimelinePage() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: contractors = [], isLoading: contractorsLoading } =
    useContractors();
  const { data: project } = useProject();

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");

  const isLoading = tasksLoading || contractorsLoading;

  const contractorList = contractors.map((c) => ({ id: c.id, name: c.name }));

  // Filter tasks by assignee
  const filteredTasks = useMemo(() => {
    if (assigneeFilter === "all") return tasks;
    if (assigneeFilter === "none") return tasks.filter((t) => !t.assignee_id);
    const userId = Object.entries(USER_MAP).find(([, name]) => name === assigneeFilter)?.[0];
    return tasks.filter((t) => t.assignee_id === userId);
  }, [tasks, assigneeFilter]);

  // Progress stats
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  function handleEdit(task: Task) {
    setEditingTask(task);
    setShowForm(true);
  }

  function handleAdd() {
    setEditingTask(undefined);
    setShowForm(true);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <TimelineSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">공정 관리</h1>
          <Button size="default" onClick={handleAdd} className="shrink-0">
            <Plus weight="bold" className="size-4" />
            작업 추가
          </Button>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="flex items-center gap-4 rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3 text-xs">
              {(["todo", "in_progress", "done"] as TaskStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const count = tasks.filter((t) => t.status === s).length;
                return (
                  <span key={s} className="flex items-center gap-1.5">
                    <div className={`size-2 rounded-full ${cfg.color.replace("text-", "bg-")}`} />
                    <span className="text-muted-foreground">{cfg.label}</span>
                    <span className="font-semibold">{count}</span>
                  </span>
                );
              })}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <span className="text-xs font-semibold text-primary shrink-0">{progressPercent}%</span>
            </div>
          </div>
        )}

        {/* Tabs + Filter in one row */}
        <Tabs defaultValue="kanban">
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="kanban">
                <Kanban weight="duotone" className="size-4" />
                칸반
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <ChartBar weight="duotone" className="size-4" />
                타임라인
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-1.5">
              {(["all", "성훈", "태수", "none"] as AssigneeFilter[]).map((filter) => {
                const label =
                  filter === "all" ? "전체" : filter === "none" ? "미정" : filter;
                return (
                  <Button
                    key={filter}
                    variant={assigneeFilter === filter ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setAssigneeFilter(filter)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>

          <TabsContent value="kanban" className="mt-3">
            <KanbanView
              tasks={filteredTasks}
              contractors={contractorList}
              onEdit={handleEdit}
              onAdd={handleAdd}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-3">
            <TimelineView tasks={filteredTasks} onEdit={handleEdit} />
          </TabsContent>
        </Tabs>

        {/* Task Form Dialog */}
        {showForm && (
          <TaskFormDialog
            open={showForm}
            onOpenChange={setShowForm}
            task={editingTask}
            defaultStatus={editingTask?.status}
            tasks={tasks}
            contractors={contractorList}
          />
        )}
      </div>
    </div>
  );
}
