"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import {
  GridFour,
  Blueprint,
  Bathtub,
  Armchair,
  Bed,
  CookingPot,
  Door,
  Warehouse,
  BookOpen,
  Plant,
  Plus,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useSpaces,
  useBoardItems,
  useDoorWindows,
  useCreateSpace,
  useUpdateSpace,
  useDeleteSpace,
  useCreateBoardItem,
  useUpdateBoardItem,
  useDeleteBoardItem,
  useCreateDoorWindow,
  useUpdateDoorWindow,
  useDeleteDoorWindow,
} from "@/lib/queries";
import type {
  Space,
  BoardItem as DbBoardItem,
  DoorWindow as DbDoorWindow,
} from "@/types/database";
import type {
  Room,
  BoardItem,
  DoorWindow,
  RoomIconKey,
  Status,
  CostBreakdown,
  MaterialSpec,
} from "@/app/board-showcase/mock-data";
import { RoomCardsView } from "@/app/app/board/components/room-cards";
import { RoomDetailView } from "@/app/app/board/components/room-detail";

const FloorPlanView = dynamic(
  () =>
    import("@/app/app/board/components/floor-plan").then(
      (mod) => mod.FloorPlanView
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[450px] items-center justify-center rounded-2xl bg-muted/30 ring-1 ring-border">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">평면도 로딩 중...</p>
        </div>
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Data Transformers: DB → UI component types
// ---------------------------------------------------------------------------

function dbBoardItemToUi(item: DbBoardItem): BoardItem {
  const costBreakdown: CostBreakdown | undefined =
    item.cost_material ||
    item.cost_labor ||
    item.cost_delivery ||
    item.cost_other
      ? {
          material: item.cost_material ?? undefined,
          labor: item.cost_labor ?? undefined,
          delivery: item.cost_delivery ?? undefined,
          other: item.cost_other ?? undefined,
        }
      : undefined;

  const spec: MaterialSpec | undefined =
    item.spec_width ||
    item.spec_height ||
    item.spec_area ||
    item.spec_quantity ||
    item.spec_color ||
    item.spec_model_name ||
    item.spec_product_code ||
    item.spec_purchase_url
      ? {
          width: item.spec_width ?? undefined,
          height: item.spec_height ?? undefined,
          area: item.spec_area ?? undefined,
          quantity: item.spec_quantity ?? undefined,
          color: item.spec_color ?? undefined,
          modelName: item.spec_model_name ?? undefined,
          productCode: item.spec_product_code ?? undefined,
          purchaseUrl: item.spec_purchase_url ?? undefined,
        }
      : undefined;

  const actual =
    (item.cost_material ?? 0) +
    (item.cost_labor ?? 0) +
    (item.cost_delivery ?? 0) +
    (item.cost_other ?? 0);

  return {
    id: item.id,
    category: item.category,
    status: item.status as Status,
    decision: item.decision_content ?? undefined,
    budget: item.estimated_budget ?? undefined,
    actual: actual > 0 ? actual : undefined,
    costBreakdown,
    spec,
    constructionDate: item.construction_date ?? undefined,
    constructionEndDate: item.construction_end_date ?? undefined,
    constructionNotes: item.construction_notes ?? undefined,
  };
}

const DEFAULT_ICON: RoomIconKey = "living";
const DEFAULT_COLOR = "#8B9E6B";

function dbSpaceToRoom(space: Space, items: DbBoardItem[]): Room {
  const spaceItems = items.filter((i) => i.space_id === space.id);
  return {
    id: space.id,
    name: space.name,
    iconKey: (space.icon_key as RoomIconKey) || DEFAULT_ICON,
    color: space.color || DEFAULT_COLOR,
    items: spaceItems.map(dbBoardItemToUi),
    x: space.floor_x ?? 20,
    y: space.floor_y ?? 20,
    width: space.floor_width ?? 160,
    height: space.floor_height ?? 150,
  };
}

function dbDoorWindowToUi(dw: DbDoorWindow): DoorWindow {
  return {
    id: dw.id,
    type: dw.type as "door" | "window",
    roomId: dw.space_id,
    wall: dw.wall as "top" | "bottom" | "left" | "right",
    position: dw.position,
    width: dw.width,
  };
}

// ---------------------------------------------------------------------------
// Room icon / color options for dialog
// ---------------------------------------------------------------------------

const ROOM_ICON_OPTIONS: { key: RoomIconKey; label: string; icon: React.ReactNode }[] = [
  { key: "bathroom", label: "화장실", icon: <Bathtub size={20} weight="duotone" /> },
  { key: "living", label: "거실", icon: <Armchair size={20} weight="duotone" /> },
  { key: "bedroom", label: "안방", icon: <Bed size={20} weight="duotone" /> },
  { key: "kitchen", label: "부엌", icon: <CookingPot size={20} weight="duotone" /> },
  { key: "entrance", label: "현관", icon: <Door size={20} weight="duotone" /> },
  { key: "storage", label: "다용도실", icon: <Warehouse size={20} weight="duotone" /> },
  { key: "study", label: "서재", icon: <BookOpen size={20} weight="duotone" /> },
  { key: "balcony", label: "발코니", icon: <Plant size={20} weight="duotone" /> },
];

const ROOM_COLOR_OPTIONS = [
  "#8B9E6B",
  "#6B8E9E",
  "#9E6B8B",
  "#9E8B6B",
  "#6B9E7A",
  "#7A6B9E",
  "#9E6B6B",
  "#6B8B9E",
];

// ---------------------------------------------------------------------------
// Add/Edit Room Dialog
// ---------------------------------------------------------------------------

function RoomDialog({
  open,
  onOpenChange,
  onSave,
  initialValues,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; icon_key: string; color: string }) => void;
  initialValues?: { name: string; icon_key: string; color: string };
  title: string;
}) {
  const [name, setName] = useState(initialValues?.name || "");
  const [iconKey, setIconKey] = useState(initialValues?.icon_key || "living");
  const [color, setColor] = useState(initialValues?.color || ROOM_COLOR_OPTIONS[0]);

  // Reset form when dialog opens with new values
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(initialValues?.name || "");
      setIconKey(initialValues?.icon_key || "living");
      setColor(initialValues?.color || ROOM_COLOR_OPTIONS[0]);
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("방 이름을 입력해주세요.");
      return;
    }
    onSave({ name: name.trim(), icon_key: iconKey, color });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="room-name">방 이름</Label>
            <Input
              id="room-name"
              placeholder="예: 화장실, 거실, 안방..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSubmit();
              }}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>아이콘</Label>
            <div className="grid grid-cols-4 gap-2">
              {ROOM_ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setIconKey(opt.key)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2.5 text-xs transition-all ${
                    iconKey === opt.key
                      ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                      : "bg-muted/50 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {opt.icon}
                  <span className="text-[10px] font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>색상</Label>
            <div className="flex gap-2">
              {ROOM_COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit}>
            {initialValues ? "저장" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

function DeleteRoomDialog({
  open,
  onOpenChange,
  onConfirm,
  roomName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  roomName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>방 삭제</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <strong>{roomName}</strong>을(를) 삭제하시겠습니까?
          <br />
          이 방의 모든 항목이 삭제됩니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BoardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[450px] rounded-2xl" />
      </div>
    </div>
  );
}

function BoardError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
        <p className="text-sm font-medium text-destructive">
          데이터를 불러오는 중 오류가 발생했습니다
        </p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (connected to Supabase)
// ---------------------------------------------------------------------------

export default function BoardPage() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState<string | null>(null);

  // ─── Queries ───
  const {
    data: spaces,
    isLoading: spacesLoading,
    error: spacesError,
  } = useSpaces();
  const {
    data: boardItems,
    isLoading: itemsLoading,
    error: itemsError,
  } = useBoardItems();
  const {
    data: doorWindowsData,
    isLoading: dwLoading,
    error: dwError,
  } = useDoorWindows();

  // ─── Mutations ───
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();
  const createBoardItem = useCreateBoardItem();
  const updateBoardItem = useUpdateBoardItem();
  const deleteBoardItem = useDeleteBoardItem();
  const createDoorWindow = useCreateDoorWindow();
  const updateDoorWindowMut = useUpdateDoorWindow();
  const deleteDoorWindowMut = useDeleteDoorWindow();

  // ─── Transform DB → UI ───
  const rooms: Room[] = useMemo(() => {
    if (!spaces || !boardItems) return [];
    return spaces.map((space) => dbSpaceToRoom(space, boardItems));
  }, [spaces, boardItems]);

  const doorWindows: DoorWindow[] = useMemo(() => {
    if (!doorWindowsData) return [];
    return doorWindowsData.map(dbDoorWindowToUi);
  }, [doorWindowsData]);

  // Keep selectedRoom in sync with latest data
  const currentSelectedRoom = useMemo(() => {
    if (!selectedRoom) return null;
    return rooms.find((r) => r.id === selectedRoom.id) ?? selectedRoom;
  }, [selectedRoom, rooms]);

  // ─── Mutation callbacks ───

  const handleSelectRoom = useCallback(
    (room: Room) => {
      const realRoom = rooms.find((r) => r.id === room.id);
      setSelectedRoom(realRoom ?? room);
    },
    [rooms]
  );

  const handleRoomDrag = useCallback(
    (roomId: string, x: number, y: number) => {
      updateSpace.mutate({ id: roomId, floor_x: x, floor_y: y });
    },
    [updateSpace]
  );

  const handleRoomResize = useCallback(
    (roomId: string, w: number, h: number) => {
      updateSpace.mutate({ id: roomId, floor_width: w, floor_height: h });
    },
    [updateSpace]
  );

  const handleDoorWindowCreate = useCallback(
    (dw: Omit<DoorWindow, "id">) => {
      createDoorWindow.mutate({
        space_id: dw.roomId,
        type: dw.type as "door" | "window",
        wall: dw.wall as "top" | "bottom" | "left" | "right",
        position: dw.position,
        width: dw.width,
      });
    },
    [createDoorWindow]
  );

  const handleDoorWindowUpdate = useCallback(
    (id: string, updates: Partial<DoorWindow>) => {
      // Only send DB-relevant fields
      const dbUpdates: Record<string, unknown> = {};
      if (updates.wall !== undefined) dbUpdates.wall = updates.wall;
      if (updates.position !== undefined) dbUpdates.position = updates.position;
      if (updates.width !== undefined) dbUpdates.width = updates.width;
      if (Object.keys(dbUpdates).length > 0) {
        updateDoorWindowMut.mutate({ id, ...dbUpdates } as Parameters<typeof updateDoorWindowMut.mutate>[0]);
      }
    },
    [updateDoorWindowMut]
  );

  const handleDoorWindowDelete = useCallback(
    (id: string) => {
      // Skip temp IDs (optimistic adds that haven't been saved yet)
      if (!id.startsWith("temp-")) {
        deleteDoorWindowMut.mutate(id);
      }
    },
    [deleteDoorWindowMut]
  );

  const handleUpdateBoardItem = useCallback(
    (itemId: string, updates: Partial<BoardItem>) => {
      // Map UI BoardItem fields → DB BoardItem fields
      const dbUpdates: Record<string, unknown> = { id: itemId };
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.decision !== undefined)
        dbUpdates.decision_content = updates.decision;
      if (updates.budget !== undefined)
        dbUpdates.estimated_budget = updates.budget;

      updateBoardItem.mutate(
        dbUpdates as Parameters<typeof updateBoardItem.mutate>[0]
      );
    },
    [updateBoardItem]
  );

  const handleDeleteBoardItem = useCallback(
    (itemId: string) => {
      deleteBoardItem.mutate(itemId);
    },
    [deleteBoardItem]
  );

  const handleAddBoardItem = useCallback(
    (spaceId: string) => {
      createBoardItem.mutate({
        space_id: spaceId,
        category: "새 항목",
      });
    },
    [createBoardItem]
  );

  // ─── Room CRUD callbacks ───

  const handleAddRoom = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  const handleCreateRoom = useCallback(
    (data: { name: string; icon_key: string; color: string }) => {
      createSpace.mutate(
        { name: data.name, icon_key: data.icon_key, color: data.color },
        {
          onSuccess: () => toast.success(`"${data.name}" 방이 추가되었습니다.`),
          onError: () => toast.error("방 추가에 실패했습니다."),
        }
      );
    },
    [createSpace]
  );

  const handleEditRoom = useCallback(
    (roomId: string) => {
      setTargetRoomId(roomId);
      setEditDialogOpen(true);
    },
    []
  );

  const handleSaveEditRoom = useCallback(
    (data: { name: string; icon_key: string; color: string }) => {
      if (!targetRoomId) return;
      updateSpace.mutate(
        { id: targetRoomId, name: data.name, icon_key: data.icon_key, color: data.color },
        {
          onSuccess: () => toast.success("방 정보가 수정되었습니다."),
          onError: () => toast.error("방 수정에 실패했습니다."),
        }
      );
    },
    [targetRoomId, updateSpace]
  );

  const handleDeleteRoom = useCallback(
    (roomId: string) => {
      setTargetRoomId(roomId);
      setDeleteDialogOpen(true);
    },
    []
  );

  const handleConfirmDelete = useCallback(() => {
    if (!targetRoomId) return;
    const roomName = rooms.find((r) => r.id === targetRoomId)?.name || "방";
    deleteSpace.mutate(targetRoomId, {
      onSuccess: () => toast.success(`"${roomName}" 방이 삭제되었습니다.`),
      onError: () => toast.error("방 삭제에 실패했습니다."),
    });
    setTargetRoomId(null);
  }, [targetRoomId, rooms, deleteSpace]);

  const targetRoom = useMemo(
    () => rooms.find((r) => r.id === targetRoomId),
    [rooms, targetRoomId]
  );

  // ─── Loading ───
  const isLoading = spacesLoading || itemsLoading || dwLoading;
  if (isLoading) return <BoardSkeleton />;

  // ─── Error ───
  const error = spacesError || itemsError || dwError;
  if (error) return <BoardError message={(error as Error).message} />;

  // ─── Empty ───
  if (!spaces || spaces.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-center gap-5 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <GridFour size={32} weight="duotone" className="text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">공간을 추가해서 시작하세요</p>
            <p className="text-sm text-muted-foreground mt-1">
              화장실, 거실, 부엌 등 공간을 만들고 항목을 관리할 수 있어요
            </p>
          </div>
          <Button size="lg" onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus size={18} weight="bold" />
            공간 추가
          </Button>
        </div>

        <RoomDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSave={handleCreateRoom}
          title="방 추가"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <AnimatePresence mode="wait">
        {currentSelectedRoom ? (
          <RoomDetailView
            key="detail"
            room={currentSelectedRoom}
            onBack={() => setSelectedRoom(null)}
            onUpdateItem={handleUpdateBoardItem}
            onDeleteItem={handleDeleteBoardItem}
            onAddItem={handleAddBoardItem}
            onEditRoom={handleEditRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        ) : (
          <motion.div
            key="board"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Intro */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-1"
            >
              <h1 className="text-2xl font-bold">프로젝트 보드</h1>
              <p className="text-sm text-muted-foreground">
                방 카드로 전체 현황을 한눈에 보고, 평면도에서 배치를
                관리하세요. 방을 클릭하면 상세 화면으로 이동합니다.
              </p>
            </motion.div>

            <Tabs defaultValue="cards" className="w-full">
              <TabsList>
                <TabsTrigger value="cards" className="gap-1.5">
                  <GridFour size={16} weight="duotone" />
                  카드 뷰
                </TabsTrigger>
                <TabsTrigger value="floorplan" className="gap-1.5">
                  <Blueprint size={16} weight="duotone" />
                  평면도
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cards" className="mt-4">
                <RoomCardsView
                  rooms={rooms}
                  onSelectRoom={handleSelectRoom}
                  onAddRoom={handleAddRoom}
                />
              </TabsContent>

              <TabsContent value="floorplan" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  방을 드래그로 이동하고, 꼭짓점/변을 드래그해서 크기를
                  조절하세요. 문/창문 도구로 벽에 클릭하면 추가됩니다.
                  스크롤로 확대/축소.
                </p>
                <FloorPlanView
                  rooms={rooms}
                  doorsWindows={doorWindows}
                  onRoomDrag={handleRoomDrag}
                  onRoomResize={handleRoomResize}
                  onDoorWindowCreate={handleDoorWindowCreate}
                  onDoorWindowUpdate={handleDoorWindowUpdate}
                  onDoorWindowDelete={handleDoorWindowDelete}
                  onSelectRoom={handleSelectRoom}
                  onAddRoom={handleAddRoom}
                  onDeleteRoom={handleDeleteRoom}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Room Dialog */}
      <RoomDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleCreateRoom}
        title="방 추가"
      />

      {/* Edit Room Dialog */}
      <RoomDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEditRoom}
        title="방 편집"
        initialValues={
          targetRoom
            ? {
                name: targetRoom.name,
                icon_key: targetRoom.iconKey,
                color: targetRoom.color,
              }
            : undefined
        }
      />

      {/* Delete Room Confirmation */}
      <DeleteRoomDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        roomName={targetRoom?.name || ""}
      />
    </div>
  );
}
