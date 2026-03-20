"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Group,
  Line,
  Transformer,
  Circle as KonvaCircle,
} from "react-konva";
import type Konva from "konva";
import {
  Cursor,
  DoorOpen,
  FrameCorners,
  Trash,
  MinusCircle,
  PlusCircle,
  Plus,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getProgress,
  type Room,
  type DoorWindow,
} from "@/app/board-showcase/mock-data";

const GRID_SIZE = 20;
const MIN_ROOM_SIZE = 60;
const WALL_THICKNESS = 6;


type Tool = "select" | "door" | "window";

function snapToGrid(val: number) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function getClosestWall(
  localX: number,
  localY: number,
  w: number,
  h: number
): { wall: "top" | "bottom" | "left" | "right"; position: number } {
  const distances = {
    top: localY,
    bottom: h - localY,
    left: localX,
    right: w - localX,
  };
  const closest = (Object.keys(distances) as Array<keyof typeof distances>).reduce(
    (a, b) => (distances[a] < distances[b] ? a : b)
  );
  let position: number;
  if (closest === "top" || closest === "bottom") {
    position = Math.max(0.1, Math.min(0.9, localX / w));
  } else {
    position = Math.max(0.1, Math.min(0.9, localY / h));
  }
  return { wall: closest, position };
}

// Room component on the canvas
function FloorPlanRoom({
  room,
  isSelected,
  progress,
  tool,
  onSelect,
  onDragEnd,
  onResize,
  onDoubleClick,
  onWallClick,
}: {
  room: Room;
  isSelected: boolean;
  progress: number;
  tool: Tool;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onDoubleClick: () => void;
  onWallClick: (wall: "top" | "bottom" | "left" | "right", position: number) => void;
}) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const w = room.width;
  const h = room.height;
  const progressWidth = Math.max(0, (w - 16) * (progress / 100));
  const decidedCount = room.items.filter(
    (i) => i.status !== "undecided" && i.status !== "has_candidates"
  ).length;
  const totalBudget = room.items.reduce((s, i) => s + (i.budget || 0), 0);
  const totalActual = room.items.reduce((s, i) => s + (i.actual || 0), 0);

  const isSmall = w < 120 || h < 120;
  const isMedium = !isSmall && (w < 200 || h < 180);
  const isLarge = !isSmall && !isMedium;


  const statusDotColors: Record<string, string> = {
    undecided: "#ccc",
    has_candidates: "#e5a200",
    decided: "#16a34a",
    purchased: "#2563eb",
    installed: "#9333ea",
  };

  return (
    <>
      <Group
        x={room.x}
        y={room.y}
        draggable={tool === "select"}
        onClick={(e) => {
          e.cancelBubble = true;
          if (tool === "door" || tool === "window") {
            const stage = e.target.getStage();
            if (!stage) return;
            const pos = stage.getPointerPosition();
            if (!pos) return;
            const localX = pos.x - room.x;
            const localY = pos.y - room.y;
            const { wall, position } = getClosestWall(localX, localY, w, h);
            onWallClick(wall, position);
          } else {
            onSelect();
          }
        }}
        onDblClick={() => onDoubleClick()}
        onDblTap={() => onDoubleClick()}
        onDragEnd={(e) => {
          const node = e.target;
          const snappedX = snapToGrid(node.x());
          const snappedY = snapToGrid(node.y());
          node.position({ x: snappedX, y: snappedY });
          onDragEnd(snappedX, snappedY);
        }}
      >
        <Rect
          ref={shapeRef}
          width={w}
          height={h}
          fill={room.color + (progress > 75 ? "30" : progress > 50 ? "22" : progress > 25 ? "18" : "10")}
          stroke={isSelected ? room.color : "#9998"}
          strokeWidth={isSelected ? 2.5 : 1.5}
          cornerRadius={6}
          shadowColor="rgba(0,0,0,0.06)"
          shadowBlur={isSelected ? 10 : 3}
          shadowOffsetY={2}
          onTransformEnd={() => {
            const node = shapeRef.current;
            if (!node) return;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);
            const newW = snapToGrid(Math.max(MIN_ROOM_SIZE, node.width() * scaleX));
            const newH = snapToGrid(Math.max(MIN_ROOM_SIZE, node.height() * scaleY));
            node.width(newW);
            node.height(newH);
            onResize(newW, newH);
          }}
        />

        {(tool === "door" || tool === "window") && (
          <>
            <Rect x={0} y={-2} width={w} height={4} fill={tool === "door" ? "#8B691430" : "#87CEEB30"} cornerRadius={2} />
            <Rect x={0} y={h - 2} width={w} height={4} fill={tool === "door" ? "#8B691430" : "#87CEEB30"} cornerRadius={2} />
            <Rect x={-2} y={0} width={4} height={h} fill={tool === "door" ? "#8B691430" : "#87CEEB30"} cornerRadius={2} />
            <Rect x={w - 2} y={0} width={4} height={h} fill={tool === "door" ? "#8B691430" : "#87CEEB30"} cornerRadius={2} />
          </>
        )}

        {isSmall && (
          <Text text={room.name} x={0} y={h / 2 - 7} width={w} align="center" fontSize={11} fontFamily="Pretendard Variable, system-ui" fontStyle="600" fill="#555" />
        )}

        {isMedium && (
          <>
            <Text text={room.name} x={0} y={h / 2 - 16} width={w} align="center" fontSize={13} fontFamily="Pretendard Variable, system-ui" fontStyle="600" fill="#444" />
            <Text text={`${decidedCount}/${room.items.length} 결정`} x={0} y={h / 2 + 2} width={w} align="center" fontSize={10} fontFamily="Pretendard Variable, system-ui" fill="#999" />
            <Rect x={8} y={h - 14} width={w - 16} height={4} fill="#0000000a" cornerRadius={2} />
            <Rect x={8} y={h - 14} width={progressWidth} height={4} fill={room.color + "90"} cornerRadius={2} />
          </>
        )}

        {isLarge && (
          <>
            <Text text={room.name} x={0} y={14} width={w} align="center" fontSize={14} fontFamily="Pretendard Variable, system-ui" fontStyle="700" fill="#333" />
            {room.items.map((item, idx) => {
              const dotSize = 7;
              const gap = 3;
              const totalDotsWidth = room.items.length * dotSize + (room.items.length - 1) * gap;
              const startX = (w - totalDotsWidth) / 2;
              return (
                <Group key={item.id}>
                  <KonvaCircle x={startX + idx * (dotSize + gap) + dotSize / 2} y={38} radius={dotSize / 2} fill={statusDotColors[item.status]} />
                </Group>
              );
            })}
            <Text text={room.items.map((i) => i.category[0]).join("  ")} x={0} y={46} width={w} align="center" fontSize={7} fontFamily="Pretendard Variable, system-ui" fill="#bbb" letterSpacing={0.3} />
            <Text text={`${decidedCount}/${room.items.length} 결정`} x={0} y={h / 2 + 2} width={w} align="center" fontSize={10} fontFamily="Pretendard Variable, system-ui" fill="#999" />
            {totalBudget > 0 && (
              <Text
                text={totalActual > 0 ? `${(totalBudget / 10000).toFixed(0)}만 / ${(totalActual / 10000).toFixed(0)}만` : `예산 ${(totalBudget / 10000).toFixed(0)}만`}
                x={0} y={h / 2 + 16} width={w} align="center" fontSize={9} fontFamily="Pretendard Variable, system-ui" fill={totalActual > 0 ? "#16a34a" : "#aaa"}
              />
            )}
            <Rect x={10} y={h - 16} width={w - 20} height={5} fill="#0000000a" cornerRadius={2.5} />
            <Rect x={10} y={h - 16} width={Math.max(0, (w - 20) * (progress / 100))} height={5} fill={room.color + "90"} cornerRadius={2.5} />
            <Text text={`${progress}%`} x={0} y={h - 28} width={w} align="center" fontSize={8} fontFamily="Pretendard Variable, system-ui" fill="#aaa" />
          </>
        )}
      </Group>

      {isSelected && tool === "select" && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          keepRatio={false}
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
          boundBoxFunc={(_, newBox) => ({
            ...newBox,
            width: Math.max(MIN_ROOM_SIZE, newBox.width),
            height: Math.max(MIN_ROOM_SIZE, newBox.height),
          })}
          anchorSize={8}
          anchorCornerRadius={3}
          anchorStroke={room.color}
          anchorFill="#fff"
          borderStroke={room.color}
          borderDash={[4, 4]}
        />
      )}
    </>
  );
}

const HANDLE_SIZE = 10;
const MIN_DW_WIDTH = 15;

function getDwRect(dw: DoorWindow, room: Room) {
  const rw = room.width;
  const rh = room.height;
  const mw = dw.width;
  const isHorizontal = dw.wall === "top" || dw.wall === "bottom";
  let x = 0, y = 0, w = 0, h = 0;
  switch (dw.wall) {
    case "top": x = room.x + rw * dw.position - mw / 2; y = room.y - WALL_THICKNESS / 2; w = mw; h = WALL_THICKNESS; break;
    case "bottom": x = room.x + rw * dw.position - mw / 2; y = room.y + rh - WALL_THICKNESS / 2; w = mw; h = WALL_THICKNESS; break;
    case "left": x = room.x - WALL_THICKNESS / 2; y = room.y + rh * dw.position - mw / 2; w = WALL_THICKNESS; h = mw; break;
    case "right": x = room.x + rw - WALL_THICKNESS / 2; y = room.y + rh * dw.position - mw / 2; w = WALL_THICKNESS; h = mw; break;
  }
  return { x, y, w, h, isHorizontal };
}

function snapToClosestWall(
  px: number, py: number, room: Room
): { wall: "top" | "bottom" | "left" | "right"; position: number } {
  const localX = px - room.x;
  const localY = py - room.y;
  const w = room.width;
  const h = room.height;
  const distances = { top: Math.abs(localY), bottom: Math.abs(localY - h), left: Math.abs(localX), right: Math.abs(localX - w) };
  const closest = (Object.keys(distances) as Array<keyof typeof distances>).reduce((a, b) => (distances[a] < distances[b] ? a : b));
  let position: number;
  if (closest === "top" || closest === "bottom") {
    position = Math.max(0.08, Math.min(0.92, localX / w));
  } else {
    position = Math.max(0.08, Math.min(0.92, localY / h));
  }
  return { wall: closest, position };
}

function DoorWindowMarker({
  dw,
  rooms,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: {
  dw: DoorWindow;
  rooms: Room[];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DoorWindow>) => void;
  onDelete: () => void;
}) {
  const room = rooms.find((r) => r.id === dw.roomId);
  if (!room) return null;
  const { x, y, w, h, isHorizontal } = getDwRect(dw, room);
  const isDoor = dw.type === "door";
  const color = isDoor ? "#8B6914" : "#5BA8C8";

  const handleBodyDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const pos = node.position();
    const cx = pos.x + (isHorizontal ? dw.width / 2 : WALL_THICKNESS / 2);
    const cy = pos.y + (isHorizontal ? WALL_THICKNESS / 2 : dw.width / 2);
    const { wall, position } = snapToClosestWall(cx, cy, room);
    const snapped = getDwRect({ ...dw, wall, position }, room);
    node.position({ x: snapped.x, y: snapped.y });
    onUpdate({ wall, position });
  };

  const handleResizeEnd = (end: "start" | "end") => (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const node = e.target;
    const handleCenter = { x: node.x() + HANDLE_SIZE / 2, y: node.y() + HANDLE_SIZE / 2 };
    if (isHorizontal) {
      const currentCenter = room.x + room.width * dw.position;
      const halfW = dw.width / 2;
      let startX = currentCenter - halfW;
      let endX = currentCenter + halfW;
      if (end === "start") { startX = Math.max(room.x, Math.min(endX - MIN_DW_WIDTH, handleCenter.x)); }
      else { endX = Math.max(startX + MIN_DW_WIDTH, Math.min(room.x + room.width, handleCenter.x)); }
      const newWidth = Math.round(endX - startX);
      const newCenter = (startX + endX) / 2;
      const newPosition = Math.max(0.08, Math.min(0.92, (newCenter - room.x) / room.width));
      onUpdate({ width: newWidth, position: newPosition });
    } else {
      const currentCenter = room.y + room.height * dw.position;
      const halfW = dw.width / 2;
      let startY = currentCenter - halfW;
      let endY = currentCenter + halfW;
      if (end === "start") { startY = Math.max(room.y, Math.min(endY - MIN_DW_WIDTH, handleCenter.y)); }
      else { endY = Math.max(startY + MIN_DW_WIDTH, Math.min(room.y + room.height, handleCenter.y)); }
      const newWidth = Math.round(endY - startY);
      const newCenter = (startY + endY) / 2;
      const newPosition = Math.max(0.08, Math.min(0.92, (newCenter - room.y) / room.height));
      onUpdate({ width: newWidth, position: newPosition });
    }
  };

  const startHandle = isHorizontal
    ? { x: x - HANDLE_SIZE / 2, y: y + h / 2 - HANDLE_SIZE / 2 }
    : { x: x + w / 2 - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2 };
  const endHandle = isHorizontal
    ? { x: x + w - HANDLE_SIZE / 2, y: y + h / 2 - HANDLE_SIZE / 2 }
    : { x: x + w / 2 - HANDLE_SIZE / 2, y: y + h - HANDLE_SIZE / 2 };
  const deleteBtnPos = isHorizontal
    ? { x: x + w + 4, y: y - 6 }
    : { x: x - 6, y: y - 22 };
  const setCursor = (cursor: string) => (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = cursor;
  };

  return (
    <Group>
      <Rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill="#FAFAF8" />
      <Rect
        x={x} y={y} width={w} height={h} fill={color} cornerRadius={2}
        stroke={isSelected ? color : "transparent"} strokeWidth={isSelected ? 2 : 0}
        shadowColor={isSelected ? color : "transparent"} shadowBlur={isSelected ? 8 : 0} shadowOpacity={0.35}
        draggable
        onClick={(e) => { e.cancelBubble = true; onSelect(); }}
        onTap={(e) => { e.cancelBubble = true; onSelect(); }}
        onDragEnd={handleBodyDragEnd}
        onMouseEnter={setCursor("grab")}
        onMouseLeave={setCursor("default")}
      />
      {isSelected && (
        <>
          <Text
            text={`${isDoor ? "문" : "창"} ${dw.width}px`}
            x={isHorizontal ? x + w / 2 - 18 : x + w + 6}
            y={isHorizontal ? y + h + 4 : y + h / 2 - 5}
            fontSize={9} fontFamily="Pretendard Variable, system-ui" fontStyle="600" fill={color}
          />
          <Group x={deleteBtnPos.x} y={deleteBtnPos.y}
            onClick={(e) => { e.cancelBubble = true; onDelete(); }}
            onTap={(e) => { e.cancelBubble = true; onDelete(); }}
            onMouseEnter={setCursor("pointer")} onMouseLeave={setCursor("default")}
          >
            <Rect x={0} y={0} width={18} height={18} fill="#fff" stroke="#e2e2e2" strokeWidth={1} cornerRadius={4} shadowColor="rgba(0,0,0,0.1)" shadowBlur={4} shadowOffsetY={1} />
            <Line points={[5, 5, 13, 13]} stroke="#dc2626" strokeWidth={1.8} lineCap="round" />
            <Line points={[13, 5, 5, 13]} stroke="#dc2626" strokeWidth={1.8} lineCap="round" />
          </Group>
          <Rect x={startHandle.x} y={startHandle.y} width={HANDLE_SIZE} height={HANDLE_SIZE} fill="#fff" stroke={color} strokeWidth={2} cornerRadius={HANDLE_SIZE / 2} draggable onDragEnd={handleResizeEnd("start")} onMouseEnter={setCursor(isHorizontal ? "col-resize" : "row-resize")} onMouseLeave={setCursor("default")} />
          <Rect x={endHandle.x} y={endHandle.y} width={HANDLE_SIZE} height={HANDLE_SIZE} fill="#fff" stroke={color} strokeWidth={2} cornerRadius={HANDLE_SIZE / 2} draggable onDragEnd={handleResizeEnd("end")} onMouseEnter={setCursor(isHorizontal ? "col-resize" : "row-resize")} onMouseLeave={setCursor("default")} />
        </>
      )}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Main FloorPlanView - accepts rooms, doorWindows, and mutation callbacks
// ---------------------------------------------------------------------------

export function FloorPlanView({
  rooms: initialRooms,
  doorsWindows: initialDoorsWindows,
  onRoomDrag,
  onRoomResize,
  onDoorWindowCreate,
  onDoorWindowUpdate,
  onDoorWindowDelete,
  onSelectRoom,
  onAddRoom,
  onDeleteRoom,
}: {
  rooms: Room[];
  doorsWindows: DoorWindow[];
  onRoomDrag: (roomId: string, x: number, y: number) => void;
  onRoomResize: (roomId: string, w: number, h: number) => void;
  onDoorWindowCreate: (dw: Omit<DoorWindow, "id">) => void;
  onDoorWindowUpdate: (id: string, updates: Partial<DoorWindow>) => void;
  onDoorWindowDelete: (id: string) => void;
  onSelectRoom: (room: Room) => void;
  onAddRoom?: () => void;
  onDeleteRoom?: (roomId: string) => void;
}) {
  // Local state mirrors props for immediate visual feedback
  const [rooms, setRooms] = useState(initialRooms);
  const [doorsWindows, setDoorsWindows] = useState(initialDoorsWindows);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDwId, setSelectedDwId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [stageSize, setStageSize] = useState({ width: 800, height: 550 });
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Sync with props when they change (after mutations complete)
  useEffect(() => { setRooms(initialRooms); }, [initialRooms]);
  useEffect(() => { setDoorsWindows(initialDoorsWindows); }, [initialDoorsWindows]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setStageSize({ width: w, height: Math.max(450, w * 0.55) });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedDwId) {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        setDoorsWindows((prev) => prev.filter((d) => d.id !== selectedDwId));
        onDoorWindowDelete(selectedDwId);
        setSelectedDwId(null);
        toast.success("삭제했습니다.");
      }
      if (e.key === "Escape") {
        setSelectedRoomId(null);
        setSelectedDwId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDwId, onDoorWindowDelete]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        setSelectedRoomId(null);
        setSelectedDwId(null);
      }
    },
    []
  );

  const handleDragEnd = useCallback((roomId: string, x: number, y: number) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, x, y } : r)));
    onRoomDrag(roomId, x, y);
  }, [onRoomDrag]);

  const handleResize = useCallback((roomId: string, w: number, h: number) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, width: w, height: h } : r)));
    onRoomResize(roomId, w, h);
  }, [onRoomResize]);

  const handleWallClick = useCallback(
    (roomId: string, wall: "top" | "bottom" | "left" | "right", position: number) => {
      const type = tool === "door" ? "door" : "window";
      const newDw: DoorWindow = {
        id: `temp-${Date.now()}`,
        type,
        roomId,
        wall,
        position,
        width: type === "door" ? 30 : 40,
      };
      setDoorsWindows((prev) => [...prev, newDw]);
      onDoorWindowCreate({ type, roomId, wall, position, width: newDw.width });
      setTool("select");
      toast.success(`${type === "door" ? "문" : "창문"}을 추가했습니다.`);
    },
    [tool, onDoorWindowCreate]
  );

  const handleDeleteDw = useCallback(() => {
    if (!selectedDwId) return;
    setDoorsWindows((prev) => prev.filter((d) => d.id !== selectedDwId));
    onDoorWindowDelete(selectedDwId);
    setSelectedDwId(null);
    toast.success("삭제했습니다.");
  }, [selectedDwId, onDoorWindowDelete]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.3, Math.min(2.5, newScale));
    setScale(clampedScale);
    stage.scale({ x: clampedScale, y: clampedScale });
  }, []);

  const gridLines = [];
  const gridW = stageSize.width / scale;
  const gridH = stageSize.height / scale;
  for (let i = 0; i <= gridW; i += GRID_SIZE) {
    gridLines.push(<Line key={`v${i}`} points={[i, 0, i, gridH]} stroke="#00000008" strokeWidth={0.5} />);
  }
  for (let i = 0; i <= gridH; i += GRID_SIZE) {
    gridLines.push(<Line key={`h${i}`} points={[0, i, gridW, i]} stroke="#00000008" strokeWidth={0.5} />);
  }

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "select", icon: <Cursor size={16} weight={tool === "select" ? "fill" : "regular"} />, label: "선택" },
    { id: "door", icon: <DoorOpen size={16} weight={tool === "door" ? "fill" : "regular"} />, label: "문 추가" },
    { id: "window", icon: <FrameCorners size={16} weight={tool === "window" ? "fill" : "regular"} />, label: "창문 추가" },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-2 ring-1 ring-border">
        {tools.map((t) => (
          <Button key={t.id} variant={tool === t.id ? "default" : "ghost"} size="sm" onClick={() => setTool(t.id)} className="gap-1.5">
            {t.icon} {t.label}
          </Button>
        ))}
        <div className="mx-1 h-6 w-px bg-border" />
        {onAddRoom && (
          <Button variant="ghost" size="sm" onClick={onAddRoom} className="gap-1.5">
            <Plus size={14} weight="bold" /> 방 추가
          </Button>
        )}
        {selectedDwId && (
          <Button variant="ghost" size="sm" onClick={handleDeleteDw} className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash size={14} /> 삭제
          </Button>
        )}
        {selectedRoomId && onDeleteRoom && !selectedDwId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteRoom(selectedRoomId)}
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash size={14} /> 방 삭제
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => { const ns = Math.max(0.3, scale - 0.15); setScale(ns); stageRef.current?.scale({ x: ns, y: ns }); }} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <MinusCircle size={18} />
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
          <button onClick={() => { const ns = Math.min(2.5, scale + 0.15); setScale(ns); stageRef.current?.scale({ x: ns, y: ns }); }} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <PlusCircle size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          {tool === "select" && "클릭으로 선택 · 드래그로 이동 · 핸들로 크기 조절 · 문/창문도 드래그로 이동 · 더블클릭으로 상세"}
          {tool === "door" && "방의 벽을 클릭하면 문이 추가됩니다"}
          {tool === "window" && "방의 벽을 클릭하면 창문이 추가됩니다"}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded-sm bg-[#8B6914]" /> 문</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded-sm bg-[#5BA8C8]" /> 창문</span>
        </div>
      </div>

      <div ref={containerRef} className="overflow-hidden rounded-2xl bg-[#FAFAF8] ring-1 ring-border dark:bg-[#1c1b18]">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onClick={handleStageClick}
          onWheel={handleWheel}
          scaleX={scale}
          scaleY={scale}
          draggable={tool === "select"}
          style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        >
          <Layer listening={false}>{gridLines}</Layer>
          <Layer>
            {rooms.map((room) => (
              <FloorPlanRoom
                key={room.id}
                room={room}
                isSelected={selectedRoomId === room.id}
                progress={getProgress(room.items)}
                tool={tool}
                onSelect={() => { setSelectedRoomId(room.id); setSelectedDwId(null); }}
                onDragEnd={(x, y) => handleDragEnd(room.id, x, y)}
                onResize={(w, h) => handleResize(room.id, w, h)}
                onDoubleClick={() => onSelectRoom(room)}
                onWallClick={(wall, position) => handleWallClick(room.id, wall, position)}
              />
            ))}
          </Layer>
          <Layer>
            {doorsWindows.map((dw) => (
              <DoorWindowMarker
                key={dw.id}
                dw={dw}
                rooms={rooms}
                isSelected={selectedDwId === dw.id}
                onSelect={() => { setSelectedDwId(dw.id); setSelectedRoomId(null); }}
                onUpdate={(updates) => {
                  setDoorsWindows((prev) => prev.map((d) => (d.id === dw.id ? { ...d, ...updates } : d)));
                  onDoorWindowUpdate(dw.id, updates);
                }}
                onDelete={() => {
                  setDoorsWindows((prev) => prev.filter((d) => d.id !== dw.id));
                  onDoorWindowDelete(dw.id);
                  setSelectedDwId(null);
                  toast.success("삭제했습니다.");
                }}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
