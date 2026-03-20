"use client";

import { motion } from "motion/react";
import {
  Check,
  Circle,
  ShoppingCart,
  Wrench,
  ListDashes,
  CaretRight,
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
import {
  getProgress,
  STATUS_CONFIG,
  type Room,
  type Status,
  type RoomIconKey,
} from "@/app/board-showcase/mock-data";

const ROOM_ICONS: Record<RoomIconKey, React.ReactNode> = {
  bathroom: <Bathtub size={22} weight="duotone" />,
  living: <Armchair size={22} weight="duotone" />,
  bedroom: <Bed size={22} weight="duotone" />,
  kitchen: <CookingPot size={22} weight="duotone" />,
  entrance: <Door size={22} weight="duotone" />,
  storage: <Warehouse size={22} weight="duotone" />,
  study: <BookOpen size={22} weight="duotone" />,
  balcony: <Plant size={22} weight="duotone" />,
};

function StatusDot({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}
    >
      {status === "decided" && <Check size={10} weight="bold" />}
      {status === "purchased" && <ShoppingCart size={10} weight="bold" />}
      {status === "installed" && <Wrench size={10} weight="bold" />}
      {status === "has_candidates" && <ListDashes size={10} weight="bold" />}
      {status === "undecided" && <Circle size={10} />}
      {config.label}
    </span>
  );
}

function ProgressBar({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
        {progress}%
      </span>
    </div>
  );
}

function RoomCard({
  room,
  index,
  onSelect,
}: {
  room: Room;
  index: number;
  onSelect: (room: Room) => void;
}) {
  const progress = getProgress(room.items);
  const decided = room.items.filter(
    (i) =>
      i.status === "decided" ||
      i.status === "purchased" ||
      i.status === "installed"
  ).length;
  const totalBudget = room.items.reduce((s, i) => s + (i.budget || 0), 0);
  const totalActual = room.items.reduce((s, i) => s + (i.actual || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      onClick={() => onSelect(room)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-all hover:shadow-xl hover:ring-2"
      style={
        {
          "--room-color": room.color,
          "--hover-ring": room.color + "60",
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.setProperty(
          "--tw-ring-color",
          room.color + "50"
        );
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.removeProperty(
          "--tw-ring-color"
        );
      }}
    >
      {/* Top accent line */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${room.color}, ${room.color}88)` }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: room.color + "15", color: room.color }}
          >
            {ROOM_ICONS[room.iconKey]}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold leading-tight">{room.name}</h3>
            <p className="text-[11px] text-muted-foreground">
              {decided}/{room.items.length} 결정
            </p>
          </div>
          <CaretRight
            size={16}
            weight="bold"
            className="shrink-0 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground"
          />
        </div>

        {/* Progress */}
        <ProgressBar progress={progress} color={room.color} />

        {/* Status pills */}
        <div className="mt-3 flex flex-wrap gap-1">
          {room.items.slice(0, 3).map((item) => (
            <StatusDot key={item.id} status={item.status} />
          ))}
          {room.items.length > 3 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{room.items.length - 3}
            </span>
          )}
        </div>

        {/* Budget */}
        {totalBudget > 0 && (
          <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-border pt-2">
            <span className="text-[10px] text-muted-foreground">예산</span>
            <span className="text-xs font-semibold tabular-nums">
              {(totalBudget / 10000).toLocaleString()}만
            </span>
          </div>
        )}
        {totalActual > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-muted-foreground">지출</span>
            <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {(totalActual / 10000).toLocaleString()}만
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function RoomCardsView({
  rooms,
  onSelectRoom,
  onAddRoom,
}: {
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
  onAddRoom?: () => void;
}) {
  const totalProgress = rooms.length > 0
    ? Math.round(
        rooms.reduce((s, r) => s + getProgress(r.items), 0) / rooms.length
      )
    : 0;

  return (
    <div className="space-y-5">
      {/* House summary bar */}
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-5 py-3 ring-1 ring-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Warehouse size={20} weight="duotone" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold">전체 진행률</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary/10">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${totalProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <span className="text-sm font-bold tabular-nums text-primary">
              {totalProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* Room grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {rooms.map((room, i) => (
          <RoomCard
            key={room.id}
            room={room}
            index={i}
            onSelect={onSelectRoom}
          />
        ))}
        {onAddRoom && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: rooms.length * 0.06, duration: 0.35 }}
            whileHover={{ y: -4, transition: { duration: 0.15 } }}
            onClick={onAddRoom}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
            style={{ minHeight: 160 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Plus size={22} weight="bold" className="text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              방 추가
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
