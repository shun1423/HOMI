"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  DotsSixVertical,
  Check,
  Circle,
  ShoppingCart,
  Wrench,
  ListDashes,
  Camera,
  Phone,
  Plus,
  Trash,
  Star,
  CaretDown,
  Warning,
  Image as ImageIcon,
  PencilSimple,
  X,
  FloppyDisk,
  CurrencyCircleDollar,
  Clock,
  MapPin,
  CloudArrowUp,
  LinkSimple,
  Ruler,
  Images,
  Hammer,
  Storefront,
  Note,
  SpinnerGap,
  Scales,
  ChatText,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  STATUS_CONFIG,
  getTotalCost,
  type Room,
  type BoardItem,
  type Status,
  type RoomIconKey,
} from "@/app/board-showcase/mock-data";
import {
  useBoardItemMemos,
  useCreateBoardItemMemo,
  useBoardItemPhotos,
  useBoardItemShowrooms,
  useBoardItemHistory,
  useCreateBoardItemHistory,
  useCandidates,
  useCreateCandidate,
  useUpdateCandidate,
  useDeleteCandidate,
  useCandidatePhotos,
  useCreateCandidatePhoto,
  useDeleteCandidatePhoto,
  useUpdateBoardItem,
  useContractors,
  queryKeys,
} from "@/lib/queries";
import type {
  Candidate as DbCandidate,
  BoardItemMemo as DbMemo,
  BoardItemPhoto as DbPhoto,
  BoardItemShowroom as DbShowroom,
  BoardItemHistory as DbHistory,
  Contractor as DbContractor,
  CandidatePhoto as DbCandidatePhoto,
  PhotoStage,
} from "@/types/database";
import { USER_MAP } from "@/lib/constants";
import {
  Bathtub,
  Armchair,
  Bed,
  CookingPot,
  Door,
  Warehouse,
  BookOpen,
  Plant,
} from "@phosphor-icons/react";

// ===========================================================================
// Constants
// ===========================================================================

const ROOM_ICONS: Record<RoomIconKey, React.ReactNode> = {
  bathroom: <Bathtub size={24} weight="duotone" />,
  living: <Armchair size={24} weight="duotone" />,
  bedroom: <Bed size={24} weight="duotone" />,
  kitchen: <CookingPot size={24} weight="duotone" />,
  entrance: <Door size={24} weight="duotone" />,
  storage: <Warehouse size={24} weight="duotone" />,
  study: <BookOpen size={24} weight="duotone" />,
  balcony: <Plant size={24} weight="duotone" />,
};

const ALL_STATUSES: Status[] = [
  "undecided",
  "has_candidates",
  "decided",
  "purchased",
  "installed",
];

type SizeUnit = "mm" | "cm" | "m";
type AreaUnit = "㎡" | "평";
type MoneyUnit = "원" | "만원";

const STAGE_LABELS: Record<string, string> = {
  before: "시공 전",
  during: "시공 중",
  after: "시공 후",
};

const VISIT_STATUS_LABELS: Record<string, string> = {
  not_visited: "미방문",
  planned: "방문 예정",
  visited: "방문 완료",
};

// ===========================================================================
// Utility functions
// ===========================================================================

function getUserName(userId: string | null): string {
  if (!userId) return "알 수 없음";
  return USER_MAP[userId] || userId.slice(0, 8);
}

function formatWon(val: number) {
  if (val >= 10000) return `${(val / 10000).toLocaleString()}만원`;
  return `${val.toLocaleString()}원`;
}

function formatNumberWithCommas(val: number): string {
  return val.toLocaleString();
}

function formatSize(value: number | null, unit: SizeUnit): string {
  if (value === null || value === undefined) return "";
  return `${value}${unit}`;
}

function toMeters(value: number, unit: SizeUnit): number {
  switch (unit) {
    case "mm":
      return value / 1000;
    case "cm":
      return value / 100;
    case "m":
      return value;
  }
}

const SQM_PER_PYEONG = 3.305785;

function sqmToPyeong(sqm: number): number {
  return Math.round((sqm / SQM_PER_PYEONG) * 100) / 100;
}

function pyeongToSqm(pyeong: number): number {
  return Math.round(pyeong * SQM_PER_PYEONG * 100) / 100;
}

function parseSizeString(raw: string): { value: number | null; unit: SizeUnit } {
  if (!raw) return { value: null, unit: "m" };
  const match = raw.match(/^([\d.]+)\s*(mm|cm|m)?$/i);
  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: (match[2]?.toLowerCase() as SizeUnit) || "m",
    };
  }
  const num = parseFloat(raw);
  return { value: isNaN(num) ? null : num, unit: "m" };
}

function parseAreaString(raw: string): { value: number | null; unit: AreaUnit } {
  if (!raw) return { value: null, unit: "㎡" };
  const match = raw.match(/^([\d.]+)\s*(㎡|평)?$/);
  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: (match[2] as AreaUnit) || "㎡",
    };
  }
  const num = parseFloat(raw);
  return { value: isNaN(num) ? null : num, unit: "㎡" };
}

function formatMoneyHelper(val: number): string {
  if (val >= 100000000)
    return `${(val / 100000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}억원`;
  if (val >= 10000)
    return `${(val / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원`;
  return `${val.toLocaleString()}원`;
}

/** Generate a random ID for stable React keys */
function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Convert Record<string,string> to array format with stable IDs */
function recordToSpecArray(
  rec: Record<string, string> | null
): Array<{ id: string; key: string; value: string }> {
  if (!rec) return [];
  return Object.entries(rec).map(([key, value]) => ({
    id: randomId(),
    key,
    value,
  }));
}

/** Convert array format back to Record<string,string> for DB */
function specArrayToRecord(
  arr: Array<{ id: string; key: string; value: string }>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of arr) {
    if (item.key.trim()) {
      result[item.key.trim()] = item.value;
    }
  }
  return result;
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ===========================================================================
// Inline mutation hooks (not in queries.ts)
// ===========================================================================

function useCreateBoardItemPhoto() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      board_item_id: string;
      file_url: string;
      stage?: PhotoStage | null;
      description?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("board_item_photos")
        .insert({
          board_item_id: input.board_item_id,
          file_url: input.file_url,
          stage: input.stage ?? null,
          description: input.description ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardItemPhotos(variables.board_item_id),
      });
    },
  });
}

function useDeleteBoardItemPhoto() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      boardItemId,
    }: {
      id: string;
      boardItemId: string;
    }) => {
      const { error } = await supabase
        .from("board_item_photos")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { boardItemId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardItemPhotos(variables.boardItemId),
      });
    },
  });
}

function useCreateShowroom() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      board_item_id: string;
      name: string;
      address?: string;
      phone?: string;
      distance_km?: number;
      visit_status?: string;
      rating?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("board_item_showrooms")
        .insert({
          board_item_id: input.board_item_id,
          name: input.name,
          address: input.address ?? null,
          phone: input.phone ?? null,
          distance_km: input.distance_km ?? null,
          visit_status: input.visit_status ?? "not_visited",
          rating: input.rating ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardItemShowrooms(variables.board_item_id),
      });
    },
  });
}

function useUpdateShowroom() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      boardItemId,
      ...updates
    }: {
      id: string;
      boardItemId: string;
      name?: string;
      address?: string | null;
      phone?: string | null;
      distance_km?: number | null;
      visit_status?: string;
      rating?: number | null;
      notes?: string | null;
      photos?: string[];
    }) => {
      const { data, error } = await supabase
        .from("board_item_showrooms")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, boardItemId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardItemShowrooms(variables.boardItemId),
      });
    },
  });
}

function useDeleteShowroom() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      boardItemId,
    }: {
      id: string;
      boardItemId: string;
    }) => {
      const { error } = await supabase
        .from("board_item_showrooms")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { boardItemId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardItemShowrooms(variables.boardItemId),
      });
    },
  });
}

function useDeleteBoardItemMemo() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      boardItemId,
    }: {
      id: string;
      boardItemId: string;
    }) => {
      const { error } = await supabase
        .from("board_item_memos")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { boardItemId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardItemMemos(variables.boardItemId),
      });
    },
  });
}

// ===========================================================================
// Reusable UI components
// ===========================================================================

function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
  switch (status) {
    case "decided":
      return <Check size={size} weight="bold" className="text-emerald-600" />;
    case "purchased":
      return <ShoppingCart size={size} weight="bold" className="text-blue-600" />;
    case "installed":
      return <Wrench size={size} weight="bold" className="text-purple-600" />;
    case "has_candidates":
      return <ListDashes size={size} weight="bold" className="text-amber-600" />;
    default:
      return <Circle size={size} className="text-muted-foreground" />;
  }
}

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={12}
          weight={i < rating ? "fill" : "regular"}
          className={i < rating ? "text-amber-500" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(value === i ? 0 : i)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            size={18}
            weight={i <= value ? "fill" : "regular"}
            className={
              i <= value ? "text-amber-500" : "text-muted-foreground/30"
            }
          />
        </button>
      ))}
    </div>
  );
}

/** Issue #4: Money input with "원" / "만원" unit toggle */
function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  const [unit, setUnit] = useState<MoneyUnit>("원");
  const [display, setDisplay] = useState(() => {
    if (value === null || value === undefined) return "";
    return value.toLocaleString();
  });

  // Compute display value based on unit
  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplay("");
      return;
    }
    if (unit === "만원") {
      const manwon = value / 10000;
      setDisplay(
        Number.isInteger(manwon)
          ? manwon.toLocaleString()
          : manwon.toLocaleString(undefined, { maximumFractionDigits: 2 })
      );
    } else {
      setDisplay(value.toLocaleString());
    }
  }, [value, unit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    if (raw === "") {
      onChange(null);
      setDisplay("");
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num)) return;

    if (unit === "만원") {
      onChange(Math.round(num * 10000));
    } else {
      onChange(Math.round(num));
    }
    // Let useEffect handle display update
  };

  const toggleUnit = () => {
    setUnit((prev) => (prev === "원" ? "만원" : "원"));
  };

  return (
    <div>
      <div className="flex gap-1">
        <Input
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          className="h-7 flex-1 text-xs"
          inputMode="decimal"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-14 shrink-0 text-[10px] font-medium"
          onClick={toggleUnit}
        >
          {unit}
        </Button>
      </div>
      {value !== null && value !== undefined && value >= 10000 && (
        <p className="mt-0.5 text-[9px] text-muted-foreground">
          {formatMoneyHelper(value)}
        </p>
      )}
    </div>
  );
}

function SizeInput({
  value,
  unit,
  onValueChange,
  onUnitChange,
  placeholder,
}: {
  value: number | null;
  unit: SizeUnit;
  onValueChange: (v: number | null) => void;
  onUnitChange: (u: SizeUnit) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-1">
      <Input
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onValueChange(v === "" ? null : parseFloat(v));
        }}
        placeholder={placeholder}
        className="h-7 flex-1 text-xs"
        inputMode="decimal"
      />
      <Select
        value={unit}
        onValueChange={(v) => onUnitChange(v as SizeUnit)}
      >
        <SelectTrigger className="h-7 w-16 text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mm" className="text-xs">mm</SelectItem>
          <SelectItem value="cm" className="text-xs">cm</SelectItem>
          <SelectItem value="m" className="text-xs">m</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function AreaInput({
  value,
  unit,
  onValueChange,
  onUnitChange,
  placeholder,
  autoValue,
}: {
  value: number | null;
  unit: AreaUnit;
  onValueChange: (v: number | null) => void;
  onUnitChange: (u: AreaUnit) => void;
  placeholder?: string;
  autoValue?: number | null;
}) {
  const isAutoCalculated = autoValue !== null && autoValue !== undefined;
  const displayValue = isAutoCalculated ? autoValue : value;

  return (
    <div>
      <div className="flex gap-1">
        <Input
          type="number"
          step="any"
          value={displayValue ?? ""}
          onChange={(e) => {
            if (isAutoCalculated) return;
            const v = e.target.value;
            onValueChange(v === "" ? null : parseFloat(v));
          }}
          placeholder={placeholder}
          className={`h-7 flex-1 text-xs ${isAutoCalculated ? "bg-muted/50 text-muted-foreground" : ""}`}
          inputMode="decimal"
          readOnly={isAutoCalculated}
        />
        <Select
          value={unit}
          onValueChange={(v) => onUnitChange(v as AreaUnit)}
        >
          <SelectTrigger className="h-7 w-16 text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="㎡" className="text-xs">㎡</SelectItem>
            <SelectItem value="평" className="text-xs">평</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isAutoCalculated && (
        <p className="mt-0.5 text-[9px] text-muted-foreground">가로 × 세로 자동 계산</p>
      )}
    </div>
  );
}

function StatusSelector({
  status,
  onChange,
}: {
  status: Status;
  onChange: (s: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[status];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative z-10">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors hover:opacity-80 ${config.bg} ${config.color}`}
      >
        <StatusIcon status={status} size={12} /> {config.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 overflow-hidden rounded-lg bg-card shadow-lg ring-1 ring-border">
          {ALL_STATUSES.map((s) => {
            const c = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(s);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors hover:bg-muted ${s === status ? "bg-muted font-semibold" : ""}`}
              >
                <StatusIcon status={s} size={12} /> {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditableName({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) onChange(draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (draft.trim()) onChange(draft.trim());
            setEditing(false);
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-7 w-full rounded border border-primary bg-transparent px-2 text-sm font-semibold outline-none"
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") setEditing(true);
      }}
      className="group/name inline-flex cursor-pointer items-center gap-1"
    >
      <span className="text-sm font-semibold">{value}</span>
      <PencilSimple
        size={12}
        className="text-muted-foreground opacity-0 group-hover/name:opacity-100"
      />
    </span>
  );
}

function EditableDecision({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(draft.trim());
            setEditing(false);
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-5 w-full rounded border border-primary/50 bg-transparent px-1.5 text-[11px] text-muted-foreground outline-none"
        placeholder="결정 내용을 입력하세요"
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") setEditing(true);
      }}
      className="group/decision inline-flex cursor-pointer items-center gap-1"
    >
      <span className="truncate text-[11px] text-muted-foreground">
        {value || "결정 내용을 입력하세요"}
      </span>
      <PencilSimple
        size={10}
        className="shrink-0 text-muted-foreground opacity-0 group-hover/decision:opacity-100"
      />
    </span>
  );
}

/** Empty state component for tabs */
function EmptyState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8">
      <Circle size={24} weight="duotone" className="text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">
        {message || "아직 등록된 정보가 없습니다. 편집 버튼을 눌러 정보를 입력하세요."}
      </p>
    </div>
  );
}

// ===========================================================================
// Issue #2: Photo upload component (Supabase Storage)
// ===========================================================================

function PhotoUploader({
  bucketName,
  storagePath,
  onUploaded,
  stage,
  description,
}: {
  bucketName: string;
  storagePath: string;
  onUploaded: (publicUrl: string) => void;
  stage?: string;
  description?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하만 가능합니다");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${storagePath}/${Date.now()}-${randomId()}.${ext}`;
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(path, file);
      if (error) {
        toast.error("업로드 실패: " + error.message);
        return;
      }
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(path);
      onUploaded(urlData.publicUrl);
    } catch {
      toast.error("업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed py-8 transition-colors ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:border-primary/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <>
          <SpinnerGap
            size={32}
            weight="bold"
            className="animate-spin text-primary"
          />
          <p className="text-xs text-muted-foreground">업로드 중...</p>
        </>
      ) : (
        <>
          <CloudArrowUp
            size={32}
            weight="duotone"
            className="text-muted-foreground/40"
          />
          <p className="text-xs text-muted-foreground">
            클릭하거나 파일을 드래그하세요
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            최대 10MB, 이미지 파일만
          </p>
        </>
      )}
    </div>
  );
}

// ===========================================================================
// Issue #1: SpecDetailsEditor with stable IDs (no focus loss)
// ===========================================================================

type SpecDetailItem = { id: string; key: string; value: string };

function SpecDetailsEditor({
  value,
  onChange,
  label,
}: {
  value: SpecDetailItem[];
  onChange: (v: SpecDetailItem[]) => void;
  label?: string;
}) {
  const handleKeyChange = (id: string, newKey: string) => {
    onChange(value.map((item) => (item.id === id ? { ...item, key: newKey } : item)));
  };

  const handleValueChange = (id: string, newVal: string) => {
    onChange(
      value.map((item) => (item.id === id ? { ...item, value: newVal } : item))
    );
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    onChange([...value, { id: randomId(), key: "", value: "" }]);
  };

  return (
    <div className="space-y-1.5">
      {value.map((item) => (
        <div key={item.id} className="flex items-center gap-1">
          <Input
            value={item.key}
            onChange={(e) => handleKeyChange(item.id, e.target.value)}
            className="h-7 w-24 text-[10px]"
            placeholder="항목명"
          />
          <Input
            value={item.value}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            className="h-7 flex-1 text-[10px]"
            placeholder="값"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive"
            onClick={() => handleRemove(item.id)}
          >
            <X size={10} />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-6 gap-1 text-[10px]"
        onClick={handleAdd}
      >
        <Plus size={10} />
        {label || "항목 추가"}
      </Button>
    </div>
  );
}

// ===========================================================================
// Tab 1: 시공 범위 (Construction Scope)
// ===========================================================================

function ItemScopeTab({
  item,
  boardItemId,
}: {
  item: BoardItem;
  boardItemId: string;
}) {
  const [editingSpec, setEditingSpec] = useState(false);
  const [editingConstruction, setEditingConstruction] = useState(false);
  const [showAddShowroom, setShowAddShowroom] = useState(false);

  const updateBoardItem = useUpdateBoardItem();
  const { data: showrooms } = useBoardItemShowrooms(boardItemId);
  const { data: history } = useBoardItemHistory(boardItemId);
  const { data: contractors } = useContractors();
  const createShowroom = useCreateShowroom();
  const updateShowroom = useUpdateShowroom();
  const deleteShowroom = useDeleteShowroom();

  // Issue #6: Query DB for contractor_id
  const { data: dbItem } = useQuery({
    queryKey: ["board-item-detail", boardItemId],
    queryFn: async () => {
      const { data } = await createClient()
        .from("board_items")
        .select("contractor_id")
        .eq("id", boardItemId)
        .single();
      return data;
    },
    enabled: !!boardItemId,
  });

  // Parse existing spec values
  const parsedWidth = parseSizeString(item.spec?.width ?? "");
  const parsedHeight = parseSizeString(item.spec?.height ?? "");
  const parsedArea = parseAreaString(item.spec?.area ?? "");

  const [specWidthVal, setSpecWidthVal] = useState<number | null>(parsedWidth.value);
  const [specWidthUnit, setSpecWidthUnit] = useState<SizeUnit>(parsedWidth.unit);
  const [specHeightVal, setSpecHeightVal] = useState<number | null>(parsedHeight.value);
  const [specHeightUnit, setSpecHeightUnit] = useState<SizeUnit>(parsedHeight.unit);
  const [specAreaVal, setSpecAreaVal] = useState<number | null>(parsedArea.value);
  const [specAreaUnit, setSpecAreaUnit] = useState<AreaUnit>(parsedArea.unit);
  const [specQuantity, setSpecQuantity] = useState(item.spec?.quantity ?? "");

  // Auto-calculate area (always in ㎡ first, then convert if needed)
  const autoArea = useMemo(() => {
    if (specWidthVal !== null && specHeightVal !== null) {
      const wMeters = toMeters(specWidthVal, specWidthUnit);
      const hMeters = toMeters(specHeightVal, specHeightUnit);
      const areaSqm = wMeters * hMeters;
      if (specAreaUnit === "평") {
        return sqmToPyeong(areaSqm);
      }
      return Math.round(areaSqm * 100) / 100;
    }
    return null;
  }, [specWidthVal, specWidthUnit, specHeightVal, specHeightUnit, specAreaUnit]);

  // Total area = unit area × quantity
  const unitArea = autoArea ?? specAreaVal;
  const parsedQuantity = parseInt(specQuantity, 10);
  const totalArea = useMemo(() => {
    if (unitArea !== null && !isNaN(parsedQuantity) && parsedQuantity > 1) {
      return Math.round(unitArea * parsedQuantity * 100) / 100;
    }
    return null;
  }, [unitArea, parsedQuantity]);

  // Construction form state - Issue #6: initialize from DB
  const [contractorId, setContractorId] = useState<string>("");
  const [constructionDate, setConstructionDate] = useState(
    item.constructionDate ?? ""
  );
  const [constructionEndDate, setConstructionEndDate] = useState(
    item.constructionEndDate ?? ""
  );
  const [constructionNotes, setConstructionNotes] = useState(
    item.constructionNotes ?? ""
  );
  const [constructionCost, setConstructionCost] = useState<number | null>(
    item.costBreakdown?.labor ?? null
  );

  // Initialize contractor from DB when data arrives
  useEffect(() => {
    if (dbItem?.contractor_id) {
      setContractorId(dbItem.contractor_id);
    }
  }, [dbItem?.contractor_id]);

  // Showroom form state
  const [srName, setSrName] = useState("");
  const [srAddress, setSrAddress] = useState("");
  const [srPhone, setSrPhone] = useState("");
  const [srDistance, setSrDistance] = useState("");
  const [srVisitStatus, setSrVisitStatus] = useState("not_visited");
  const [srRating, setSrRating] = useState(0);
  const [srNotes, setSrNotes] = useState("");

  // Issue #7: Inline editing state for showrooms
  const [editingShowroomId, setEditingShowroomId] = useState<string | null>(null);
  const [editSrVisitStatus, setEditSrVisitStatus] = useState("");
  const [editSrNotes, setEditSrNotes] = useState("");
  const [editSrRating, setEditSrRating] = useState(0);
  // Issue #4: Full showroom editing fields
  const [editSrName, setEditSrName] = useState("");
  const [editSrAddress, setEditSrAddress] = useState("");
  const [editSrPhone, setEditSrPhone] = useState("");
  const [editSrDistance, setEditSrDistance] = useState("");

  const handleSaveSpec = () => {
    const widthStr =
      specWidthVal !== null ? formatSize(specWidthVal, specWidthUnit) : null;
    const heightStr =
      specHeightVal !== null ? formatSize(specHeightVal, specHeightUnit) : null;
    const finalArea = autoArea ?? specAreaVal;
    const areaStr = finalArea !== null ? `${finalArea}${specAreaUnit}` : null;

    updateBoardItem.mutate(
      {
        id: boardItemId,
        spec_width: widthStr,
        spec_height: heightStr,
        spec_area: areaStr,
        spec_quantity: specQuantity || null,
      } as Parameters<typeof updateBoardItem.mutate>[0],
      {
        onSuccess: () => {
          toast.success("시공 범위 저장됨");
          setEditingSpec(false);
        },
        onError: () => toast.error("저장 실패"),
      }
    );
  };

  const handleSaveConstruction = () => {
    updateBoardItem.mutate(
      {
        id: boardItemId,
        contractor_id: contractorId || null,
        construction_date: constructionDate || null,
        construction_end_date: constructionEndDate || null,
        construction_notes: constructionNotes || null,
        cost_labor: constructionCost,
      } as Parameters<typeof updateBoardItem.mutate>[0],
      {
        onSuccess: () => {
          toast.success("시공 정보 저장됨");
          setEditingConstruction(false);
        },
        onError: () => toast.error("저장 실패"),
      }
    );
  };

  const handleAddShowroom = () => {
    if (!srName.trim()) {
      toast.error("쇼룸 이름을 입력하세요");
      return;
    }
    createShowroom.mutate(
      {
        board_item_id: boardItemId,
        name: srName.trim(),
        address: srAddress || undefined,
        phone: srPhone || undefined,
        distance_km: srDistance ? parseFloat(srDistance) : undefined,
        visit_status: srVisitStatus,
        rating: srRating > 0 ? srRating : undefined,
        notes: srNotes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("쇼룸 추가됨");
          setShowAddShowroom(false);
          setSrName("");
          setSrAddress("");
          setSrPhone("");
          setSrDistance("");
          setSrVisitStatus("not_visited");
          setSrRating(0);
          setSrNotes("");
        },
        onError: () => toast.error("추가 실패"),
      }
    );
  };

  // Issue #7: Start editing a showroom inline
  const startEditShowroom = (s: DbShowroom) => {
    setEditingShowroomId(s.id);
    setEditSrVisitStatus(s.visit_status);
    setEditSrNotes(s.notes ?? "");
    setEditSrRating(s.rating ?? 0);
    setEditSrName(s.name);
    setEditSrAddress(s.address ?? "");
    setEditSrPhone(s.phone ?? "");
    setEditSrDistance(s.distance_km ? String(s.distance_km) : "");
  };

  const handleSaveShowroomEdit = (showroomId: string) => {
    updateShowroom.mutate(
      {
        id: showroomId,
        boardItemId,
        name: editSrName.trim() || undefined,
        address: editSrAddress || null,
        phone: editSrPhone || null,
        distance_km: editSrDistance ? parseFloat(editSrDistance) : null,
        visit_status: editSrVisitStatus,
        notes: editSrNotes || null,
        rating: editSrRating > 0 ? editSrRating : null,
      },
      {
        onSuccess: () => {
          toast.success("쇼룸 수정됨");
          setEditingShowroomId(null);
        },
        onError: () => toast.error("수정 실패"),
      }
    );
  };

  const handleDeleteShowroom = (id: string) => {
    deleteShowroom.mutate(
      { id, boardItemId },
      {
        onSuccess: () => toast.success("쇼룸 삭제됨"),
        onError: () => toast.error("삭제 실패"),
      }
    );
  };

  // Check if all sections are empty for combined empty state
  const specHasData =
    item.spec?.width || item.spec?.area || item.spec?.quantity;
  const constructionHasData = item.constructionDate || item.constructionNotes || dbItem?.contractor_id;
  const showroomsHasData = showrooms && showrooms.length > 0;
  const historyHasData = history && history.length > 0;
  const allEmpty = !specHasData && !constructionHasData && !showroomsHasData && !historyHasData && !editingSpec && !editingConstruction;

  if (allEmpty) {
    return (
      <div className="space-y-3">
        <EmptyState message="아직 등록된 시공 범위 정보가 없습니다. 편집 버튼을 눌러 정보를 입력하세요." />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-[10px]"
            onClick={() => setEditingSpec(true)}
          >
            <Ruler size={12} weight="duotone" />
            시공 면적 입력
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-[10px]"
            onClick={() => setEditingConstruction(true)}
          >
            <Hammer size={12} weight="duotone" />
            시공 정보 입력
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-[10px]"
            onClick={() => setShowAddShowroom(true)}
          >
            <Storefront size={12} weight="duotone" />
            쇼룸 추가
          </Button>
        </div>
        {/* Add Showroom Dialog */}
        {renderShowroomDialog()}
      </div>
    );
  }

  function renderShowroomDialog() {
    return (
      <Dialog open={showAddShowroom} onOpenChange={setShowAddShowroom}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">쇼룸 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">이름 *</Label>
              <Input
                value={srName}
                onChange={(e) => setSrName(e.target.value)}
                className="h-8 text-xs"
                placeholder="쇼룸명"
              />
            </div>
            <div>
              <Label className="text-xs">주소</Label>
              <Input
                value={srAddress}
                onChange={(e) => setSrAddress(e.target.value)}
                className="h-8 text-xs"
                placeholder="서울시 강남구..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">전화번호</Label>
                <Input
                  value={srPhone}
                  onChange={(e) => setSrPhone(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <Label className="text-xs">거리 (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={srDistance}
                  onChange={(e) => setSrDistance(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="12.5"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">방문 상태</Label>
              <Select
                value={srVisitStatus}
                onValueChange={(v) => setSrVisitStatus(v ?? "not_visited")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="미방문" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_visited" className="text-xs">미방문</SelectItem>
                  <SelectItem value="planned" className="text-xs">방문 예정</SelectItem>
                  <SelectItem value="visited" className="text-xs">방문 완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">평점</Label>
              <StarRatingInput value={srRating} onChange={setSrRating} />
            </div>
            <div>
              <Label className="text-xs">메모</Label>
              <Textarea
                value={srNotes}
                onChange={(e) => setSrNotes(e.target.value)}
                className="min-h-[60px] text-xs"
                placeholder="쇼룸 관련 메모..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddShowroom(false)}
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleAddShowroom}
              disabled={createShowroom.isPending}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-3">
      {/* Spec Section: 시공 면적 */}
      <div className="rounded-lg bg-muted/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Ruler size={12} weight="duotone" />
            시공 면적
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px]"
            onClick={() => setEditingSpec(!editingSpec)}
          >
            <PencilSimple size={10} />
            {editingSpec ? "취소" : "편집"}
          </Button>
        </div>
        {editingSpec ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">가로</Label>
                <SizeInput
                  value={specWidthVal}
                  unit={specWidthUnit}
                  onValueChange={setSpecWidthVal}
                  onUnitChange={setSpecWidthUnit}
                  placeholder="3.2"
                />
              </div>
              <div>
                <Label className="text-[10px]">세로</Label>
                <SizeInput
                  value={specHeightVal}
                  unit={specHeightUnit}
                  onValueChange={setSpecHeightVal}
                  onUnitChange={setSpecHeightUnit}
                  placeholder="2.4"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">
                  면적{" "}
                  {autoArea !== null && specAreaVal === null
                    ? "(자동 계산)"
                    : ""}
                </Label>
                <AreaInput
                  value={specAreaVal}
                  unit={specAreaUnit}
                  onValueChange={setSpecAreaVal}
                  onUnitChange={setSpecAreaUnit}
                  placeholder="7.68"
                  autoValue={autoArea}
                />
              </div>
              <div>
                <Label className="text-[10px]">수량</Label>
                <Input
                  type="number"
                  value={specQuantity}
                  onChange={(e) => setSpecQuantity(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="1"
                  inputMode="numeric"
                />
              </div>
            </div>
            {totalArea !== null && (
              <div className="rounded-md bg-primary/5 px-2.5 py-1.5 text-[11px]">
                <span className="text-muted-foreground">총 면적</span>{" "}
                <span className="ml-1 font-semibold text-primary">
                  {totalArea}{specAreaUnit}
                </span>
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({unitArea}{specAreaUnit} × {parsedQuantity}개)
                </span>
              </div>
            )}
            <Button
              size="sm"
              className="h-7 gap-1 text-[10px]"
              onClick={handleSaveSpec}
              disabled={updateBoardItem.isPending}
            >
              <FloppyDisk size={10} />
              저장
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            {item.spec?.width && (
              <div>
                <span className="text-muted-foreground">사이즈</span>{" "}
                <span className="ml-1 font-medium">
                  {item.spec.width}
                  {item.spec.height && ` x ${item.spec.height}`}
                </span>
              </div>
            )}
            {item.spec?.area && (
              <div>
                <span className="text-muted-foreground">면적</span>{" "}
                <span className="ml-1 font-medium">{item.spec.area}</span>
              </div>
            )}
            {item.spec?.quantity && (
              <div>
                <span className="text-muted-foreground">수량</span>{" "}
                <span className="ml-1 font-medium">{item.spec.quantity}</span>
              </div>
            )}
            {totalArea !== null && (
              <div className="col-span-2">
                <span className="text-muted-foreground">총 면적</span>{" "}
                <span className="ml-1 font-semibold text-primary">{totalArea}{specAreaUnit}</span>
              </div>
            )}
            {!specHasData && (
              <p className="col-span-2 text-muted-foreground">
                시공 면적 정보 없음
              </p>
            )}
          </div>
        )}
      </div>

      {/* Construction Section */}
      <div className="rounded-lg bg-muted/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Hammer size={12} weight="duotone" />
            시공 정보
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px]"
            onClick={() => setEditingConstruction(!editingConstruction)}
          >
            <PencilSimple size={10} />
            {editingConstruction ? "취소" : "편집"}
          </Button>
        </div>
        {editingConstruction ? (
          <div className="space-y-2">
            <div>
              <Label className="text-[10px]">시공업자</Label>
              <Select
                value={contractorId}
                onValueChange={(v) => setContractorId(v ?? "")}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="업자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {contractors?.map((c: DbContractor) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">시공 시작일</Label>
                <Input
                  type="date"
                  value={constructionDate}
                  onChange={(e) => setConstructionDate(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">시공 종료일</Label>
                <Input
                  type="date"
                  value={constructionEndDate}
                  onChange={(e) => setConstructionEndDate(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">시공비</Label>
              <MoneyInput
                value={constructionCost}
                onChange={setConstructionCost}
                placeholder="시공비 입력"
              />
            </div>
            <div>
              <Label className="text-[10px]">메모</Label>
              <Textarea
                value={constructionNotes}
                onChange={(e) => setConstructionNotes(e.target.value)}
                className="min-h-[60px] text-xs"
              />
            </div>
            <Button
              size="sm"
              className="h-7 gap-1 text-[10px]"
              onClick={handleSaveConstruction}
              disabled={updateBoardItem.isPending}
            >
              <FloppyDisk size={10} />
              저장
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5 text-[11px]">
            {contractorId && contractors && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">시공업자</span>
                <span className="font-medium">
                  {contractors.find((c: DbContractor) => c.id === contractorId)?.name ?? "-"}
                </span>
              </div>
            )}
            {item.costBreakdown?.labor && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">시공비</span>
                <span className="font-medium">{formatWon(item.costBreakdown.labor)}</span>
              </div>
            )}
            {item.constructionDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">시공일</span>
                <span>
                  {item.constructionDate}
                  {item.constructionEndDate &&
                    ` ~ ${item.constructionEndDate}`}
                </span>
              </div>
            )}
            {item.constructionNotes && (
              <div className="mt-1 rounded bg-amber-50 p-2 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                <Warning size={11} className="mb-0.5 inline" />{" "}
                {item.constructionNotes}
              </div>
            )}
            {!constructionHasData && (
              <p className="text-muted-foreground">시공 정보 없음</p>
            )}
          </div>
        )}
      </div>

      {/* Showrooms: Issue #7 with edit capability */}
      <div className="rounded-lg bg-muted/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Storefront size={12} weight="duotone" />
            쇼룸 ({showrooms?.length ?? 0})
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px]"
            onClick={() => setShowAddShowroom(true)}
          >
            <Plus size={10} />
            추가
          </Button>
        </div>
        {showrooms && showrooms.length > 0 ? (
          showrooms.map((s: DbShowroom) => (
            <div
              key={s.id}
              className="mb-2 space-y-1 rounded-lg bg-background p-3 text-[11px] ring-1 ring-border last:mb-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{s.name}</span>
                <div className="flex items-center gap-1.5">
                  {s.rating && <Stars rating={s.rating} />}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() =>
                      editingShowroomId === s.id
                        ? setEditingShowroomId(null)
                        : startEditShowroom(s)
                    }
                  >
                    <PencilSimple size={10} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteShowroom(s.id)}
                  >
                    <Trash size={10} />
                  </Button>
                </div>
              </div>
              {s.address && (
                <p className="text-muted-foreground">
                  <MapPin size={10} className="mb-0.5 mr-0.5 inline" />
                  {s.address}
                </p>
              )}
              <div className="flex gap-3 text-muted-foreground">
                {s.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={10} />
                    {s.phone}
                  </span>
                )}
                {s.distance_km && <span>{s.distance_km}km</span>}
              </div>
              {s.notes && (
                <p className="italic text-muted-foreground">
                  &quot;{s.notes}&quot;
                </p>
              )}
              <Badge variant="outline" className="text-[9px]">
                {s.visit_status === "visited"
                  ? "방문 완료"
                  : s.visit_status === "planned"
                    ? "방문 예정"
                    : "미방문"}
              </Badge>

              {/* Issue #3: Showroom photos */}
              {(s as DbShowroom & { photos?: string[] }).photos &&
                ((s as DbShowroom & { photos?: string[] }).photos?.length ?? 0) > 0 && (
                <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
                  {(s as DbShowroom & { photos?: string[] }).photos!.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Issue #7: Inline edit for showroom (Issue #4: full editing) */}
              {editingShowroomId === s.id && (
                <div className="mt-2 space-y-2 border-t border-dashed border-border pt-2">
                  <div>
                    <Label className="text-[10px]">이름</Label>
                    <Input
                      value={editSrName}
                      onChange={(e) => setEditSrName(e.target.value)}
                      className="h-7 text-[10px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">주소</Label>
                    <Input
                      value={editSrAddress}
                      onChange={(e) => setEditSrAddress(e.target.value)}
                      className="h-7 text-[10px]"
                      placeholder="서울시 강남구..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">전화번호</Label>
                      <Input
                        value={editSrPhone}
                        onChange={(e) => setEditSrPhone(e.target.value)}
                        className="h-7 text-[10px]"
                        placeholder="010-1234-5678"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">거리 (km)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editSrDistance}
                        onChange={(e) => setEditSrDistance(e.target.value)}
                        className="h-7 text-[10px]"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px]">방문 상태</Label>
                    <Select
                      value={editSrVisitStatus}
                      onValueChange={(v) => setEditSrVisitStatus(v ?? "not_visited")}
                    >
                      <SelectTrigger className="h-7 text-[10px]">
                        <SelectValue placeholder="미방문" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_visited" className="text-xs">미방문</SelectItem>
                        <SelectItem value="planned" className="text-xs">방문 예정</SelectItem>
                        <SelectItem value="visited" className="text-xs">방문 완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">평점</Label>
                    <StarRatingInput
                      value={editSrRating}
                      onChange={setEditSrRating}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">메모</Label>
                    <Textarea
                      value={editSrNotes}
                      onChange={(e) => setEditSrNotes(e.target.value)}
                      className="min-h-[40px] text-[10px]"
                    />
                  </div>
                  {/* Issue #3: Photo upload for showroom (when visited) */}
                  {editSrVisitStatus === "visited" && (
                    <div>
                      <Label className="text-[10px]">방문 사진</Label>
                      <PhotoUploader
                        bucketName="photos"
                        storagePath={`showrooms/${s.id}`}
                        onUploaded={async (publicUrl) => {
                          const existing = (s as DbShowroom & { photos?: string[] }).photos ?? [];
                          updateShowroom.mutate(
                            {
                              id: s.id,
                              boardItemId,
                              photos: [...existing, publicUrl] as unknown as undefined,
                            } as Parameters<typeof updateShowroom.mutate>[0],
                            { onSuccess: () => toast.success("사진 추가됨") }
                          );
                        }}
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setEditingShowroomId(null)}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => handleSaveShowroomEdit(s.id)}
                      disabled={updateShowroom.isPending}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-[11px] text-muted-foreground">등록된 쇼룸 없음</p>
        )}
      </div>

      {/* History */}
      {history && history.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Clock size={12} weight="duotone" />
            변경 이력
          </p>
          <div className="relative space-y-0 pl-4">
            <div className="absolute bottom-1 left-[5px] top-1 w-px bg-border" />
            {history.map((h: DbHistory, i: number) => (
              <div key={h.id} className="relative flex gap-3 pb-2.5 last:pb-0">
                <div
                  className={`absolute left-[-11px] top-1 h-2 w-2 rounded-full ring-2 ring-background ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`}
                />
                <div>
                  <p className="text-[11px]">{h.action}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString("ko-KR")} ·{" "}
                    {getUserName(h.user_id)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {renderShowroomDialog()}
    </div>
  );
}

// ===========================================================================
// Tab 2: 후보 (Candidates)
// ===========================================================================

type PriceMode = "unit" | "total";
const PRICE_UNIT_OPTIONS = ["원/㎡", "원/개", "원/m", "원/세트"] as const;

interface CandidateFormState {
  name: string;
  brand: string;
  rating: number;
  priceMode: PriceMode;
  totalPrice: number | null;
  unitPrice: number | null;
  priceUnit: string;
  quantity: number | null;
  pros: string;
  cons: string;
  purchaseUrl: string;
  specDetails: SpecDetailItem[];
}

function getInitialFormState(
  parentSpecArea?: string | null,
  parentItem?: BoardItem
): CandidateFormState {
  const areaNum = parentSpecArea ? parseFloat(parentSpecArea) : null;
  // Issue #10: Pre-fill spec details from parent board item's spec fields
  const defaultSpecDetails: SpecDetailItem[] = [];
  if (parentItem?.spec?.color) {
    defaultSpecDetails.push({ id: randomId(), key: "색상", value: parentItem.spec.color });
  }
  if (parentItem?.spec?.modelName) {
    defaultSpecDetails.push({ id: randomId(), key: "모델명", value: parentItem.spec.modelName });
  }
  if (parentItem?.spec?.productCode) {
    defaultSpecDetails.push({ id: randomId(), key: "제품코드", value: parentItem.spec.productCode });
  }
  if (parentItem?.spec?.purchaseUrl) {
    defaultSpecDetails.push({ id: randomId(), key: "구매링크", value: parentItem.spec.purchaseUrl });
  }
  return {
    name: "",
    brand: "",
    rating: 0,
    priceMode: "total",
    totalPrice: null,
    unitPrice: null,
    priceUnit: "원/㎡",
    quantity: areaNum && !isNaN(areaNum) ? areaNum : null,
    pros: "",
    cons: "",
    purchaseUrl: "",
    specDetails: defaultSpecDetails,
  };
}

function candidateToFormState(c: DbCandidate): CandidateFormState {
  return {
    name: c.name,
    brand: c.brand ?? "",
    rating: c.rating ?? 0,
    priceMode: c.unit_price ? "unit" : "total",
    totalPrice: c.price,
    unitPrice: c.unit_price,
    priceUnit: c.price_unit ?? "원/㎡",
    quantity: c.quantity,
    pros: c.pros ?? "",
    cons: c.cons ?? "",
    purchaseUrl: c.purchase_url ?? "",
    specDetails: recordToSpecArray(c.spec_details),
  };
}

function CandidateFormFields({
  form,
  setForm,
}: {
  form: CandidateFormState;
  setForm: React.Dispatch<React.SetStateAction<CandidateFormState>>;
}) {
  const set = <K extends keyof CandidateFormState>(
    key: K,
    val: CandidateFormState[K]
  ) => setForm((prev) => ({ ...prev, [key]: val }));

  const estimatedTotal =
    form.priceMode === "unit" && form.unitPrice && form.quantity
      ? Math.round(form.unitPrice * form.quantity)
      : null;

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">이름 *</Label>
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="h-8 text-xs"
          placeholder="제품명"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">브랜드</Label>
          <Input
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">평점</Label>
          <StarRatingInput
            value={form.rating}
            onChange={(v) => set("rating", v)}
          />
        </div>
      </div>

      {/* Price section */}
      <div className="space-y-2 rounded-lg bg-muted/30 p-2.5">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold">가격</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={form.priceMode === "unit" ? "default" : "outline"}
              size="sm"
              className="h-5 px-2 text-[9px]"
              onClick={() => set("priceMode", "unit")}
            >
              단가
            </Button>
            <Button
              type="button"
              variant={form.priceMode === "total" ? "default" : "outline"}
              size="sm"
              className="h-5 px-2 text-[9px]"
              onClick={() => set("priceMode", "total")}
            >
              총가
            </Button>
          </div>
        </div>
        {form.priceMode === "unit" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">단가</Label>
                <MoneyInput
                  value={form.unitPrice}
                  onChange={(v) => set("unitPrice", v)}
                  placeholder="150,000"
                />
              </div>
              <div>
                <Label className="text-[10px]">단위</Label>
                <Select
                  value={form.priceUnit}
                  onValueChange={(v) => set("priceUnit", v ?? "원/㎡")}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u} className="text-xs">
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[10px]">수량</Label>
              <Input
                type="number"
                step="0.01"
                value={form.quantity ?? ""}
                onChange={(e) =>
                  set(
                    "quantity",
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
                className="h-7 text-xs"
                placeholder="7.68"
              />
            </div>
            {estimatedTotal !== null && (
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                예상 총액: {formatWon(estimatedTotal)}
              </p>
            )}
          </div>
        ) : (
          <div>
            <Label className="text-[10px]">총 가격</Label>
            <MoneyInput
              value={form.totalPrice}
              onChange={(v) => set("totalPrice", v)}
              placeholder="1,200,000"
            />
          </div>
        )}
      </div>

      {/* Issue #11: Product spec details (제품 규격) */}
      <div>
        <Label className="text-xs font-semibold">제품 규격</Label>
        <p className="mb-1 text-[9px] text-muted-foreground">
          타일 크기, 두께, 재질 등 제품 자체의 스펙
        </p>
        <SpecDetailsEditor
          value={form.specDetails}
          onChange={(v) => set("specDetails", v)}
          label="규격 항목 추가"
        />
      </div>

      <div>
        <Label className="text-xs">장점</Label>
        <Input
          value={form.pros}
          onChange={(e) => set("pros", e.target.value)}
          className="h-8 text-xs"
          placeholder="색감 자연스러움"
        />
      </div>
      <div>
        <Label className="text-xs">단점</Label>
        <Input
          value={form.cons}
          onChange={(e) => set("cons", e.target.value)}
          className="h-8 text-xs"
          placeholder="가격 높음"
        />
      </div>
      <div>
        <Label className="text-xs">구매 링크</Label>
        <Input
          value={form.purchaseUrl}
          onChange={(e) => set("purchaseUrl", e.target.value)}
          className="h-8 text-xs"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate photo grid with upload (Issue #3)
// ---------------------------------------------------------------------------

function CandidatePhotoGrid({
  candidateId,
}: {
  candidateId: string;
}) {
  const { data: photos } = useCandidatePhotos(candidateId);
  const createPhoto = useCreateCandidatePhoto();
  const deletePhoto = useDeleteCandidatePhoto();
  const [showUpload, setShowUpload] = useState(false);

  const handleUploaded = (publicUrl: string) => {
    createPhoto.mutate(
      { candidate_id: candidateId, file_url: publicUrl },
      {
        onSuccess: () => {
          toast.success("사진 추가됨");
          setShowUpload(false);
        },
        onError: () => toast.error("사진 저장 실패"),
      }
    );
  };

  const handleDelete = (photoId: string) => {
    deletePhoto.mutate(
      { id: photoId, candidateId },
      {
        onSuccess: () => toast.success("사진 삭제됨"),
        onError: () => toast.error("삭제 실패"),
      }
    );
  };

  return (
    <div className="space-y-1.5">
      {photos && photos.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto">
          {photos.map((p: DbCandidatePhoto) => (
            <div
              key={p.id}
              className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-md ring-1 ring-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbnail_url || p.file_url}
                alt={p.description || ""}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => handleDelete(p.id)}
                className="absolute right-0.5 top-0.5 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:block"
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {showUpload ? (
        <PhotoUploader
          bucketName="candidates"
          storagePath={`candidates/${candidateId}`}
          onUploaded={handleUploaded}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 text-[10px]"
          onClick={() => setShowUpload(true)}
        >
          <Camera size={10} weight="duotone" />
          사진 추가
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single candidate card (view + inline edit)
// ---------------------------------------------------------------------------

function CandidateCard({
  candidate,
  boardItemId,
  onDecide,
  onDelete,
}: {
  candidate: DbCandidate;
  boardItemId: string;
  onDecide: () => void;
  onDelete: () => void;
}) {
  const updateCandidate = useUpdateCandidate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CandidateFormState>(() =>
    candidateToFormState(candidate)
  );

  useEffect(() => {
    if (!editing) {
      setForm(candidateToFormState(candidate));
    }
  }, [candidate, editing]);

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    const specRecord = specArrayToRecord(form.specDetails);
    const payload: Parameters<typeof updateCandidate.mutate>[0] = {
      id: candidate.id,
      board_item_id: boardItemId,
      name: form.name.trim(),
      brand: form.brand || null,
      rating: form.rating > 0 ? form.rating : null,
      pros: form.pros || null,
      cons: form.cons || null,
      purchase_url: form.purchaseUrl || null,
      spec_details:
        Object.keys(specRecord).length > 0 ? specRecord : null,
      ...(form.priceMode === "unit"
        ? {
            unit_price: form.unitPrice,
            price_unit: form.priceUnit,
            quantity: form.quantity,
            price: null,
          }
        : {
            price: form.totalPrice,
            unit_price: null,
            price_unit: null,
            quantity: null,
          }),
    };
    updateCandidate.mutate(payload, {
      onSuccess: () => {
        toast.success("저장됨");
        setEditing(false);
      },
      onError: () => toast.error("저장 실패"),
    });
  };

  const handleCancel = () => {
    setForm(candidateToFormState(candidate));
    setEditing(false);
  };

  const c = candidate;
  const estimatedTotal =
    c.unit_price && c.quantity ? Math.round(c.unit_price * c.quantity) : null;

  if (editing) {
    return (
      <div className="space-y-3 rounded-lg bg-muted/20 p-3 ring-1 ring-border">
        <CandidateFormFields form={form} setForm={setForm} />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[10px]"
            onClick={handleCancel}
          >
            <X size={10} />
            취소
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1 text-[10px]"
            onClick={handleSave}
            disabled={updateCandidate.isPending}
          >
            <FloppyDisk size={10} />
            저장
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-3 ring-1 ${c.is_selected ? "bg-emerald-50 ring-emerald-300 dark:bg-emerald-900/20 dark:ring-emerald-700" : "bg-card ring-border"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold">{c.name}</p>
            {c.rating != null && c.rating > 0 && <Stars rating={c.rating} />}
            {c.is_selected && (
              <Badge variant="default" className="h-4 px-1.5 text-[8px]">
                선택됨
              </Badge>
            )}
          </div>
          {c.brand && (
            <p className="text-[10px] text-muted-foreground">
              브랜드: {c.brand}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            onClick={() => setEditing(true)}
          >
            <PencilSimple size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash size={12} />
          </Button>
        </div>
      </div>

      {/* Photo section: Issue #3 */}
      <div className="mt-2">
        <CandidatePhotoGrid candidateId={c.id} />
      </div>

      {/* Price section: Issue #5 fix */}
      {(c.unit_price || c.price) && (
        <div className="mt-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <CurrencyCircleDollar size={12} weight="duotone" />
            가격
          </p>
          {c.unit_price ? (
            <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[10px]">
              <p>
                단가:{" "}
                <span className="font-semibold">
                  {formatNumberWithCommas(c.unit_price)}
                  {c.price_unit || "원"}
                </span>
              </p>
              {c.quantity != null && (
                <p>
                  수량:{" "}
                  <span className="font-semibold">{c.quantity}</span>
                  {c.price_unit && (
                    <span className="text-muted-foreground">
                      {c.price_unit.replace("원/", "")}
                    </span>
                  )}
                </p>
              )}
              {estimatedTotal != null && (
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  예상 총액: {formatWon(estimatedTotal)}
                </p>
              )}
            </div>
          ) : c.price ? (
            <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[10px]">
              <p>
                총 가격:{" "}
                <span className="font-semibold">{formatWon(c.price)}</span>
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Spec details (제품 규격) */}
      {c.spec_details && Object.keys(c.spec_details).length > 0 && (
        <div className="mt-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Ruler size={12} weight="duotone" />
            제품 규격
          </p>
          <div className="space-y-0.5 text-[10px]">
            {Object.entries(c.spec_details).map(([key, val]) => (
              <p key={key}>
                <span className="text-muted-foreground">{key}:</span> {val}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Pros / Cons */}
      {(c.pros || c.cons) && (
        <div className="mt-2 space-y-0.5 text-[10px]">
          {c.pros && (
            <p className="text-emerald-600 dark:text-emerald-400">
              &#10003; 장점: {c.pros}
            </p>
          )}
          {c.cons && (
            <p className="text-red-500 dark:text-red-400">
              &#10007; 단점: {c.cons}
            </p>
          )}
        </div>
      )}

      {/* Purchase URL */}
      {c.purchase_url && (
        <a
          href={c.purchase_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-500 hover:underline"
        >
          <LinkSimple size={12} />
          구매처 링크
        </a>
      )}

      {/* Decide button */}
      {!c.is_selected && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2.5 h-7 w-full gap-1 text-[10px]"
          onClick={onDecide}
        >
          <Check size={12} />
          이걸로 결정
        </Button>
      )}
    </div>
  );
}

function ItemCandidatesTab({
  boardItemId,
  parentItem,
}: {
  boardItemId: string;
  parentItem: BoardItem;
}) {
  const { data: candidates, isLoading } = useCandidates(boardItemId);
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  const deleteCandidate = useDeleteCandidate();
  const updateBoardItem = useUpdateBoardItem();
  const createHistory = useCreateBoardItemHistory();

  const [showAddDialog, setShowAddDialog] = useState(false);
  // Issue #6: Comparison view toggle
  const [compareMode, setCompareMode] = useState(false);
  const parentSpecArea = parentItem.spec?.area ?? null;
  const [addForm, setAddForm] = useState<CandidateFormState>(() =>
    getInitialFormState(parentSpecArea, parentItem)
  );

  const resetAddForm = () => setAddForm(getInitialFormState(parentSpecArea, parentItem));

  const handleAdd = () => {
    if (!addForm.name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    const specRecord = specArrayToRecord(addForm.specDetails);
    const payload: Parameters<typeof createCandidate.mutate>[0] = {
      board_item_id: boardItemId,
      name: addForm.name.trim(),
      brand: addForm.brand || undefined,
      rating: addForm.rating > 0 ? addForm.rating : undefined,
      pros: addForm.pros || undefined,
      cons: addForm.cons || undefined,
      purchase_url: addForm.purchaseUrl || undefined,
      spec_details:
        Object.keys(specRecord).length > 0 ? specRecord : undefined,
      ...(addForm.priceMode === "unit"
        ? {
            unit_price: addForm.unitPrice ?? undefined,
            price_unit: addForm.priceUnit,
            quantity: addForm.quantity ?? undefined,
          }
        : {
            price: addForm.totalPrice ?? undefined,
          }),
    };
    createCandidate.mutate(payload, {
      onSuccess: () => {
        toast.success("후보 추가됨");
        setShowAddDialog(false);
        resetAddForm();
      },
      onError: () => toast.error("추가 실패"),
    });
  };

  // Issue #9: Auto-record history on candidate decision
  // Issue #5: Confirmation before deciding
  const handleDecide = async (candidate: DbCandidate) => {
    const confirmed = window.confirm(
      `'${candidate.name}'으로 결정하시겠습니까? 항목 상태가 '결정됨'으로 변경됩니다.`
    );
    if (!confirmed) return;

    if (candidates) {
      candidates.forEach((c: DbCandidate) => {
        if (c.id !== candidate.id && c.is_selected) {
          updateCandidate.mutate({
            id: c.id,
            board_item_id: boardItemId,
            is_selected: false,
          });
        }
      });
    }
    const userId = await getCurrentUserId();
    updateCandidate.mutate(
      { id: candidate.id, board_item_id: boardItemId, is_selected: true },
      {
        onSuccess: () => {
          // Issue #7: Auto-fill cost_material from decided candidate
          const estimatedCost =
            candidate.unit_price && candidate.quantity
              ? Math.round(candidate.unit_price * candidate.quantity)
              : candidate.price ?? null;

          const boardItemUpdate: Parameters<typeof updateBoardItem.mutate>[0] = {
            id: boardItemId,
            status: "decided",
            decision_content: candidate.name,
            ...(estimatedCost ? { cost_material: estimatedCost } : {}),
          } as Parameters<typeof updateBoardItem.mutate>[0];
          updateBoardItem.mutate(boardItemUpdate);

          createHistory.mutate({
            board_item_id: boardItemId,
            action: `후보 결정: ${candidate.name}`,
            user_id: userId,
          });
          toast.success(`"${candidate.name}"으로 결정!`);
          if (estimatedCost) {
            toast.info(`자재비 ${formatMoneyHelper(estimatedCost)}이 자동 반영되었습니다`);
          }
        },
      }
    );
  };

  const handleDelete = (candidateId: string) => {
    deleteCandidate.mutate(
      { id: candidateId, boardItemId },
      {
        onSuccess: () => toast.success("후보 삭제됨"),
        onError: () => toast.error("삭제 실패"),
      }
    );
  };

  if (isLoading)
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        불러오는 중...
      </p>
    );

  return (
    <>
      {!candidates || candidates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-4">
          <ListDashes
            size={20}
            weight="duotone"
            className="text-muted-foreground/40"
          />
          <p className="text-xs text-muted-foreground">후보 제품 없음</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus size={12} />
            후보 추가
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground">
              후보 ({candidates.length})
            </p>
            <div className="flex items-center gap-1">
              {/* Issue #6: Comparison view toggle */}
              {candidates.length >= 2 && (
                <Button
                  variant={compareMode ? "default" : "outline"}
                  size="sm"
                  className="h-6 gap-1 text-[10px]"
                  onClick={() => setCompareMode(!compareMode)}
                >
                  <Scales size={10} weight="duotone" />
                  비교 보기
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-[10px]"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus size={10} />
                추가
              </Button>
            </div>
          </div>
          {parentItem.spec?.area && (
            <p className="text-[9px] text-muted-foreground">
              시공 면적: {parentItem.spec.area} (후보 수량에 자동 반영)
            </p>
          )}
          {/* Issue #6: Comparison mode - horizontal scroll layout */}
          {compareMode ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {candidates.map((c: DbCandidate) => (
                <div key={c.id} className="w-[280px] shrink-0">
                  <CandidateCard
                    candidate={c}
                    boardItemId={boardItemId}
                    onDecide={() => handleDecide(c)}
                    onDelete={() => handleDelete(c.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            candidates.map((c: DbCandidate) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                boardItemId={boardItemId}
                onDecide={() => handleDecide(c)}
                onDelete={() => handleDelete(c.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Add candidate dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">후보 추가</DialogTitle>
          </DialogHeader>
          <CandidateFormFields form={addForm} setForm={setAddForm} />
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(false)}
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={createCandidate.isPending}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===========================================================================
// Tab 3: 비용 (Cost)
// ===========================================================================

function ItemCostTab({
  item,
  boardItemId,
}: {
  item: BoardItem;
  boardItemId: string;
}) {
  const [editing, setEditing] = useState(false);
  const updateBoardItem = useUpdateBoardItem();

  const [costMaterial, setCostMaterial] = useState<number | null>(
    item.costBreakdown?.material ?? null
  );
  const [costLabor, setCostLabor] = useState<number | null>(
    item.costBreakdown?.labor ?? null
  );
  const [costDelivery, setCostDelivery] = useState<number | null>(
    item.costBreakdown?.delivery ?? null
  );
  const [costOther, setCostOther] = useState<number | null>(
    item.costBreakdown?.other ?? null
  );
  const [budget, setBudget] = useState<number | null>(item.budget ?? null);

  const total = getTotalCost(item);
  const budgetNum = item.budget || 0;
  const diff = budgetNum - total;

  const handleSave = () => {
    updateBoardItem.mutate(
      {
        id: boardItemId,
        cost_material: costMaterial,
        cost_labor: costLabor,
        cost_delivery: costDelivery,
        cost_other: costOther,
        estimated_budget: budget,
      } as Parameters<typeof updateBoardItem.mutate>[0],
      {
        onSuccess: () => {
          toast.success("비용 저장됨");
          setEditing(false);
        },
        onError: () => toast.error("저장 실패"),
      }
    );
  };

  const hasData = total > 0 || budgetNum > 0;

  return (
    <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-[11px]">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-muted-foreground">비용 상세</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-[10px]"
          onClick={() => setEditing(!editing)}
        >
          <PencilSimple size={10} />
          {editing ? "취소" : "편집"}
        </Button>
      </div>
      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">자재비</Label>
              <MoneyInput
                value={costMaterial}
                onChange={setCostMaterial}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-[10px]">시공비</Label>
              <MoneyInput
                value={costLabor}
                onChange={setCostLabor}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-[10px]">배송비</Label>
              <MoneyInput
                value={costDelivery}
                onChange={setCostDelivery}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-[10px]">기타</Label>
              <MoneyInput
                value={costOther}
                onChange={setCostOther}
                placeholder="0"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px]">예산</Label>
              <MoneyInput
                value={budget}
                onChange={setBudget}
                placeholder="0"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="h-7 gap-1 text-[10px]"
            onClick={handleSave}
            disabled={updateBoardItem.isPending}
          >
            <FloppyDisk size={10} />
            저장
          </Button>
        </div>
      ) : hasData ? (
        <>
          {item.costBreakdown?.material && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">자재비</span>
              <span className="font-medium">
                {formatWon(item.costBreakdown.material)}
              </span>
            </div>
          )}
          {item.costBreakdown?.labor && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">시공비</span>
              <span className="font-medium">
                {formatWon(item.costBreakdown.labor)}
              </span>
            </div>
          )}
          {item.costBreakdown?.delivery && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">배송비</span>
              <span className="font-medium">
                {formatWon(item.costBreakdown.delivery)}
              </span>
            </div>
          )}
          {item.costBreakdown?.other && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">기타</span>
              <span className="font-medium">
                {formatWon(item.costBreakdown.other)}
              </span>
            </div>
          )}
          {total > 0 && (
            <>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>합계</span>
                <span>{formatWon(total)}</span>
              </div>
            </>
          )}
          {budgetNum > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">예산</span>
              <span>{formatWon(budgetNum)}</span>
            </div>
          )}
          {total > 0 && budgetNum > 0 && (
            <div
              className={`flex justify-between font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}
            >
              <span>차이</span>
              <span>
                {diff >= 0
                  ? `${formatWon(diff)} 절감`
                  : `${formatWon(Math.abs(diff))} 초과`}
              </span>
            </div>
          )}
        </>
      ) : (
        <EmptyState message="비용 정보가 없습니다. 편집 버튼을 눌러 비용을 입력하세요." />
      )}
    </div>
  );
}

// ===========================================================================
// Tab 4: 사진 (Photos) — Issue #2: Real upload with Supabase Storage
// ===========================================================================

function ItemPhotosTab({ boardItemId }: { boardItemId: string }) {
  const { data: photos, isLoading } = useBoardItemPhotos(boardItemId);
  const createPhoto = useCreateBoardItemPhoto();
  const deletePhoto = useDeleteBoardItemPhoto();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadStage, setUploadStage] = useState<PhotoStage>("before");
  const [uploadDesc, setUploadDesc] = useState("");

  const handleUploaded = (publicUrl: string) => {
    createPhoto.mutate(
      {
        board_item_id: boardItemId,
        file_url: publicUrl,
        stage: uploadStage,
        description: uploadDesc || null,
      },
      {
        onSuccess: () => {
          toast.success("사진 추가됨");
          setShowUploadDialog(false);
          setUploadDesc("");
        },
        onError: () => toast.error("사진 저장 실패"),
      }
    );
  };

  const handleDeletePhoto = async (photoId: string, fileUrl?: string) => {
    // Issue #8: Delete from Storage before deleting DB record
    if (fileUrl) {
      const path = fileUrl.split("/storage/v1/object/public/photos/")[1];
      if (path) {
        const supabase = createClient();
        await supabase.storage.from("photos").remove([path]);
      }
    }
    deletePhoto.mutate(
      { id: photoId, boardItemId },
      {
        onSuccess: () => toast.success("사진 삭제됨"),
        onError: () => toast.error("삭제 실패"),
      }
    );
  };

  if (isLoading)
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        불러오는 중...
      </p>
    );

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-muted-foreground">
            사진 ({photos?.length || 0})
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px]"
            onClick={() => setShowUploadDialog(true)}
          >
            <Plus size={10} />
            사진 추가
          </Button>
        </div>
        {!photos || photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-6">
            <ImageIcon
              size={24}
              weight="duotone"
              className="text-muted-foreground/40"
            />
            <p className="text-xs text-muted-foreground">사진이 없습니다</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-[10px]"
              onClick={() => setShowUploadDialog(true)}
            >
              <Camera size={12} weight="duotone" />
              사진 추가
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p: DbPhoto) => (
              <div
                key={p.id}
                className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                {p.file_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.file_url}
                    alt={p.description ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Camera
                      size={18}
                      weight="duotone"
                      className="text-muted-foreground/20"
                    />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <span className="text-[9px] font-medium text-white">
                    {p.stage ? STAGE_LABELS[p.stage] ?? p.stage : ""}
                  </span>
                  {p.taken_at && (
                    <span className="ml-1 text-[8px] text-white/70">
                      {new Date(p.taken_at).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePhoto(p.id, p.file_url ?? undefined)}
                  className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block"
                >
                  <Trash size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">사진 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">단계</Label>
              <Select
                value={uploadStage}
                onValueChange={(v) => setUploadStage(v as PhotoStage)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="시공 전" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before" className="text-xs">시공 전</SelectItem>
                  <SelectItem value="during" className="text-xs">시공 중</SelectItem>
                  <SelectItem value="after" className="text-xs">시공 후</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">설명</Label>
              <Input
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                className="h-8 text-xs"
                placeholder="사진 설명..."
              />
            </div>
            <PhotoUploader
              bucketName="photos"
              storagePath={`board-items/${boardItemId}`}
              onUploaded={handleUploaded}
              stage={uploadStage}
              description={uploadDesc}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadDialog(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===========================================================================
// Tab 5: 메모 (Memos) — Issue #8: with delete
// ===========================================================================

function ItemMemosTab({ boardItemId }: { boardItemId: string }) {
  const { data: memos, isLoading } = useBoardItemMemos(boardItemId);
  const createMemo = useCreateBoardItemMemo();
  const deleteMemo = useDeleteBoardItemMemo();
  const [newContent, setNewContent] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleAdd = async () => {
    if (!newContent.trim()) {
      toast.error("내용을 입력하세요");
      return;
    }
    const userId = await getCurrentUserId();
    createMemo.mutate(
      {
        board_item_id: boardItemId,
        content: newContent.trim(),
        user_id: userId,
      },
      {
        onSuccess: () => {
          toast.success("메모 추가됨");
          setNewContent("");
          setShowInput(false);
        },
        onError: () => toast.error("추가 실패"),
      }
    );
  };

  const handleDelete = (memoId: string) => {
    deleteMemo.mutate(
      { id: memoId, boardItemId },
      {
        onSuccess: () => toast.success("메모 삭제됨"),
        onError: () => toast.error("삭제 실패"),
      }
    );
  };

  if (isLoading)
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        불러오는 중...
      </p>
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground">
          메모 ({memos?.length || 0})
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-[10px]"
          onClick={() => setShowInput(!showInput)}
        >
          <Plus size={10} />
          추가
        </Button>
      </div>
      {showInput && (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="메모 내용..."
            className="min-h-[60px] text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => {
                setShowInput(false);
                setNewContent("");
              }}
            >
              취소
            </Button>
            <Button
              size="sm"
              className="h-6 text-[10px]"
              onClick={handleAdd}
              disabled={createMemo.isPending}
            >
              저장
            </Button>
          </div>
        </div>
      )}
      {!memos || memos.length === 0 ? (
        <EmptyState message="메모가 없습니다. 추가 버튼을 눌러 메모를 작성하세요." />
      ) : (
        memos.map((m: DbMemo) => (
          <div key={m.id} className="group rounded-lg bg-muted/40 p-3">
            <div className="flex items-start justify-between">
              <p className="flex-1 text-xs">{m.content}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 hidden h-5 w-5 shrink-0 p-0 text-destructive hover:bg-destructive/10 group-hover:flex"
                onClick={() => handleDelete(m.id)}
              >
                <Trash size={10} />
              </Button>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">
              {new Date(m.created_at).toLocaleDateString("ko-KR")} ·{" "}
              {getUserName(m.user_id)}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

// ===========================================================================
// Item Card — main expandable card per board item
// ===========================================================================

function ItemCard({
  item,
  index,
  onDelete,
  onUpdate,
}: {
  item: BoardItem;
  index: number;
  onDelete: () => void;
  onUpdate: (updates: Partial<BoardItem>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[item.status];
  const total = getTotalCost(item);
  const updateBoardItem = useUpdateBoardItem();
  const createHistory = useCreateBoardItemHistory();

  const handleDecisionChange = (text: string) => {
    onUpdate({ decision: text });
    updateBoardItem.mutate(
      {
        id: item.id,
        decision_content: text || null,
      } as Parameters<typeof updateBoardItem.mutate>[0],
      { onError: () => toast.error("결정 내용 저장 실패") }
    );
  };

  // Issue #9: Auto-record history on status change
  const handleStatusChange = async (newStatus: Status) => {
    const oldStatus = item.status;
    onUpdate({ status: newStatus });

    const userId = await getCurrentUserId();
    const oldLabel = STATUS_CONFIG[oldStatus].label;
    const newLabel = STATUS_CONFIG[newStatus].label;

    updateBoardItem.mutate(
      { id: item.id, status: newStatus } as Parameters<
        typeof updateBoardItem.mutate
      >[0],
      {
        onSuccess: () => {
          createHistory.mutate({
            board_item_id: item.id,
            action: `상태 변경: ${oldLabel} → ${newLabel}`,
            user_id: userId,
          });
        },
        onError: () => toast.error("상태 변경 실패"),
      }
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-xl ring-1 ring-border transition-shadow hover:shadow-sm"
    >
      <div className="flex cursor-pointer items-center gap-2 p-3 transition-colors hover:bg-muted/30">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
        >
          <DotsSixVertical size={16} weight="bold" />
        </button>

        <div
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
          >
            <StatusIcon status={item.status} />
          </div>
          <div className="min-w-0 flex-1">
            <EditableName
              value={item.category}
              onChange={(name) => onUpdate({ category: name })}
            />
            <EditableDecision
              value={item.decision ?? ""}
              onChange={handleDecisionChange}
            />
            {total > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {formatWon(total)}
              </p>
            )}
          </div>
        </div>

        <StatusSelector
          status={item.status}
          onChange={handleStatusChange}
        />
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setExpanded(!expanded)}
          className="cursor-pointer"
        >
          <CaretDown size={16} className="text-muted-foreground" />
        </motion.div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="space-y-3 border-t border-border px-3 pb-3 pt-3">
              {/* NEW TAB ORDER: 시공 범위, 후보, 비용, 사진, 메모 */}
              <Tabs defaultValue="scope" className="w-full">
                <TabsList className="h-8 w-full justify-start overflow-x-auto flex-nowrap">
                  <TabsTrigger
                    value="scope"
                    className="h-6 gap-1 px-2 text-[10px]"
                  >
                    <Ruler size={12} weight="duotone" />
                    <span className="hidden sm:inline">시공 범위</span>
                    <span className="sm:hidden">범위</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="candidates"
                    className="h-6 gap-1 px-2 text-[10px]"
                  >
                    <ListDashes size={12} weight="duotone" />
                    후보
                  </TabsTrigger>
                  <TabsTrigger
                    value="cost"
                    className="h-6 gap-1 px-2 text-[10px]"
                  >
                    <CurrencyCircleDollar size={12} weight="duotone" />
                    비용
                  </TabsTrigger>
                  <TabsTrigger
                    value="photos"
                    className="h-6 gap-1 px-2 text-[10px]"
                  >
                    <Camera size={12} weight="duotone" />
                    사진
                  </TabsTrigger>
                  <TabsTrigger
                    value="memo"
                    className="h-6 gap-1 px-2 text-[10px]"
                  >
                    <ChatText size={12} weight="duotone" />
                    메모
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scope" className="mt-3">
                  <ItemScopeTab key={item.id} item={item} boardItemId={item.id} />
                </TabsContent>

                <TabsContent value="candidates" className="mt-3">
                  <ItemCandidatesTab
                    key={item.id}
                    boardItemId={item.id}
                    parentItem={item}
                  />
                </TabsContent>

                <TabsContent value="cost" className="mt-3">
                  <ItemCostTab key={item.id} item={item} boardItemId={item.id} />
                </TabsContent>

                <TabsContent value="photos" className="mt-3">
                  <ItemPhotosTab key={item.id} boardItemId={item.id} />
                </TabsContent>

                <TabsContent value="memo" className="mt-3">
                  <ItemMemosTab key={item.id} boardItemId={item.id} />
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-end border-t border-dashed border-border pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash size={12} />
                  항목 삭제
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===========================================================================
// Room-level aggregate tabs
// ===========================================================================

function AllPhotosTab({ items }: { items: BoardItem[] }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        각 항목을 열어 사진을 확인하세요.
      </p>
      {items.map((item) => (
        <ItemPhotosTabInline
          key={item.id}
          boardItemId={item.id}
          category={item.category}
        />
      ))}
    </div>
  );
}

function ItemPhotosTabInline({
  boardItemId,
  category,
}: {
  boardItemId: string;
  category: string;
}) {
  const { data: photos } = useBoardItemPhotos(boardItemId);

  if (!photos || photos.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground">
        {category} ({photos.length})
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p: DbPhoto) => (
          <div
            key={p.id}
            className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
          >
            {p.file_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.file_url}
                alt={p.description ?? ""}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Camera
                  size={24}
                  weight="duotone"
                  className="text-muted-foreground/20"
                />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-[10px] font-medium text-white">{category}</p>
              <p className="text-[9px] text-white/70">
                {p.stage ? STAGE_LABELS[p.stage] ?? p.stage : ""}
                {p.taken_at &&
                  ` · ${new Date(p.taken_at).toLocaleDateString("ko-KR")}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostTableTab({
  items,
  roomColor,
}: {
  items: BoardItem[];
  roomColor: string;
}) {
  const totalBudget = items.reduce((s, i) => s + (i.budget || 0), 0);
  const totalActual = items.reduce((s, i) => s + getTotalCost(i), 0);
  const totalMaterial = items.reduce(
    (s, i) => s + (i.costBreakdown?.material || 0),
    0
  );
  const totalLabor = items.reduce(
    (s, i) => s + (i.costBreakdown?.labor || 0),
    0
  );
  const totalDelivery = items.reduce(
    (s, i) => s + (i.costBreakdown?.delivery || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-border">
          <p className="text-lg font-bold" style={{ color: roomColor }}>
            {totalBudget > 0 ? formatWon(totalBudget) : "-"}
          </p>
          <p className="text-[10px] text-muted-foreground">총 예산</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-border">
          <p className="text-lg font-bold text-emerald-600">
            {totalActual > 0 ? formatWon(totalActual) : "-"}
          </p>
          <p className="text-[10px] text-muted-foreground">총 지출</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-border">
          <p className="text-lg font-bold">
            {totalMaterial > 0 ? formatWon(totalMaterial) : "-"}
          </p>
          <p className="text-[10px] text-muted-foreground">자재비</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-border">
          <p className="text-lg font-bold">
            {totalLabor > 0 ? formatWon(totalLabor) : "-"}
          </p>
          <p className="text-[10px] text-muted-foreground">시공비</p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">항목</th>
              <th className="px-3 py-2 text-right font-medium">예산</th>
              <th className="px-3 py-2 text-right font-medium">자재</th>
              <th className="px-3 py-2 text-right font-medium">시공</th>
              <th className="px-3 py-2 text-right font-medium">배송</th>
              <th className="px-3 py-2 text-right font-medium">합계</th>
              <th className="px-3 py-2 text-right font-medium">차이</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const t = getTotalCost(item);
              const d = (item.budget || 0) - t;
              return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{item.category}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {item.budget ? formatWon(item.budget) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {item.costBreakdown?.material
                      ? formatWon(item.costBreakdown.material)
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {item.costBreakdown?.labor
                      ? formatWon(item.costBreakdown.labor)
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {item.costBreakdown?.delivery
                      ? formatWon(item.costBreakdown.delivery)
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {t > 0 ? formatWon(t) : "-"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${t > 0 && item.budget ? (d >= 0 ? "text-emerald-600" : "text-red-500") : "text-muted-foreground"}`}
                  >
                    {t > 0 && item.budget
                      ? d >= 0
                        ? `-${formatWon(d)}`
                        : `+${formatWon(Math.abs(d))}`
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 font-semibold">
              <td className="px-3 py-2">합계</td>
              <td className="px-3 py-2 text-right">
                {totalBudget > 0 ? formatWon(totalBudget) : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {totalMaterial > 0 ? formatWon(totalMaterial) : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {totalLabor > 0 ? formatWon(totalLabor) : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {totalDelivery > 0 ? formatWon(totalDelivery) : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {totalActual > 0 ? formatWon(totalActual) : "-"}
              </td>
              <td
                className={`px-3 py-2 text-right ${totalBudget - totalActual >= 0 ? "text-emerald-600" : "text-red-500"}`}
              >
                {totalActual > 0
                  ? totalBudget - totalActual >= 0
                    ? `-${formatWon(totalBudget - totalActual)}`
                    : `+${formatWon(Math.abs(totalBudget - totalActual))}`
                  : "-"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function AllMemosTab({ items }: { items: BoardItem[] }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        각 항목별 메모를 확인하세요.
      </p>
      {items.map((item) => (
        <div key={item.id} className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {item.category}
          </p>
          <ItemMemosInline boardItemId={item.id} />
        </div>
      ))}
    </div>
  );
}

function ItemMemosInline({ boardItemId }: { boardItemId: string }) {
  const { data: memos } = useBoardItemMemos(boardItemId);

  if (!memos || memos.length === 0)
    return (
      <p className="text-[10px] text-muted-foreground">메모 없음</p>
    );

  return (
    <>
      {memos.map((m: DbMemo) => (
        <div key={m.id} className="rounded-xl bg-card p-3 ring-1 ring-border">
          <p className="text-xs leading-relaxed">{m.content}</p>
          <p className="mt-1 text-[9px] text-muted-foreground">
            {new Date(m.created_at).toLocaleDateString("ko-KR")} ·{" "}
            {getUserName(m.user_id)}
          </p>
        </div>
      ))}
    </>
  );
}

// ===========================================================================
// Main: Room Detail View
// ===========================================================================

export function RoomDetailView({
  room,
  onBack,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onEditRoom,
  onDeleteRoom,
}: {
  room: Room;
  onBack: () => void;
  onUpdateItem: (itemId: string, updates: Partial<BoardItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (spaceId: string) => void;
  onEditRoom?: (roomId: string) => void;
  onDeleteRoom?: (roomId: string) => void;
}) {
  const [items, setItems] = useState(room.items);
  const updateBoardItem = useUpdateBoardItem();

  useEffect(() => {
    setItems(room.items);
  }, [room.items]);

  const totalBudget = items.reduce((s, i) => s + (i.budget || 0), 0);
  const totalActual = items.reduce((s, i) => s + getTotalCost(i), 0);
  const decidedCount = items.filter(
    (i) =>
      i.status === "decided" ||
      i.status === "purchased" ||
      i.status === "installed"
  ).length;
  const progress =
    items.length > 0
      ? Math.round(
          items.reduce((sum, item) => {
            const w: Record<Status, number> = {
              undecided: 0,
              has_candidates: 25,
              decided: 50,
              purchased: 75,
              installed: 100,
            };
            return sum + w[item.status];
          }, 0) / items.length
        )
      : 0;

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    onDeleteItem(id);
    toast.success("삭제했습니다.");
  };

  const handleAddItem = () => {
    onAddItem(room.id);
    toast.success("항목을 추가했습니다.");
  };

  const handleUpdateItem = (id: string, updates: Partial<BoardItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
    onUpdateItem(id, updates);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      setItems(reordered);

      // Persist new sort_order for all affected items
      reordered.forEach((item, idx) => {
        updateBoardItem.mutate({
          id: item.id,
          sort_order: idx,
        } as Parameters<typeof updateBoardItem.mutate>[0]);
      });
    },
    [items, updateBoardItem]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
          <ArrowLeft size={16} />
        </Button>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: room.color + "20",
            color: room.color,
          }}
        >
          {ROOM_ICONS[room.iconKey]}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight">{room.name}</h2>
          <p className="text-xs text-muted-foreground">
            {decidedCount}/{items.length} 결정 · 예산{" "}
            {formatWon(totalBudget)}
            {totalActual > 0 && ` · 지출 ${formatWon(totalActual)}`}
          </p>
        </div>
        {(onEditRoom || onDeleteRoom) && (
          <div className="flex items-center gap-1">
            {onEditRoom && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-muted-foreground"
                onClick={() => onEditRoom(room.id)}
              >
                <PencilSimple size={14} weight="duotone" />
                편집
              </Button>
            )}
            {onDeleteRoom && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDeleteRoom(room.id)}
              >
                <Trash size={14} weight="duotone" />
                삭제
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">진행률</span>
          <span className="font-bold" style={{ color: room.color }}>
            {progress}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            style={{ background: room.color }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="items">항목 ({items.length})</TabsTrigger>
          <TabsTrigger value="photos">사진</TabsTrigger>
          <TabsTrigger value="cost">비용</TabsTrigger>
          <TabsTrigger value="memos">메모</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {items.length}개 항목
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleAddItem}
              >
                <Plus size={14} />
                추가
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item, i) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    onDelete={() => handleDeleteItem(item.id)}
                    onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {items.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Circle size={32} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  항목이 없습니다
                </p>
                <Button
                  variant="outline"
                  onClick={handleAddItem}
                  className="gap-1"
                >
                  <Plus size={14} />첫 항목 추가
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <AllPhotosTab items={items} />
        </TabsContent>
        <TabsContent value="cost" className="mt-4">
          <CostTableTab items={items} roomColor={room.color} />
        </TabsContent>
        <TabsContent value="memos" className="mt-4">
          <AllMemosTab items={items} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
