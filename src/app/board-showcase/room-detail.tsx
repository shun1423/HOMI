"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Check,
  Circle,
  ShoppingCart,
  Wrench,
  ListDashes,
  Camera,
  MapPin,
  CurrencyKrw,
  Bathtub,
  Armchair,
  Bed,
  CookingPot,
  Door,
  Warehouse,
  BookOpen,
  Plant,
  Plus,
  Trash,
  Star,
  CaretDown,
  Phone,
  Ruler,
  Palette,
  Tag,
  Link as LinkIcon,
  User,
  CalendarBlank,
  Warning,
  Image as ImageIcon,
  Package,
  Truck,
  Hammer,
  PencilSimple,
  ClockCounterClockwise,
  Note,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  STATUS_CONFIG,
  getTotalCost,
  type Room,
  type BoardItem,
  type Status,
  type RoomIconKey,
} from "./mock-data";

// ─── Constants ───
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

const ALL_STATUSES: Status[] = ["undecided", "has_candidates", "decided", "purchased", "installed"];

// ─── Helpers ───

function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
  switch (status) {
    case "decided": return <Check size={size} weight="bold" className="text-emerald-600" />;
    case "purchased": return <ShoppingCart size={size} weight="bold" className="text-blue-600" />;
    case "installed": return <Wrench size={size} weight="bold" className="text-purple-600" />;
    case "has_candidates": return <ListDashes size={size} weight="bold" className="text-amber-600" />;
    default: return <Circle size={size} className="text-muted-foreground" />;
  }
}

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={12} weight={i < rating ? "fill" : "regular"} className={i < rating ? "text-amber-500" : "text-muted-foreground/30"} />
      ))}
    </div>
  );
}

function formatWon(val: number) {
  if (val >= 10000) return `${(val / 10000).toLocaleString()}만원`;
  return `${val.toLocaleString()}원`;
}

// ─── Status Selector ───

function StatusSelector({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[status];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative z-10">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors hover:opacity-80 ${config.bg} ${config.color}`}
      >
        <StatusIcon status={status} size={12} />
        {config.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 overflow-hidden rounded-lg bg-card shadow-lg ring-1 ring-border">
          {ALL_STATUSES.map((s) => {
            const c = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors hover:bg-muted ${s === status ? "bg-muted font-semibold" : ""}`}
              >
                <StatusIcon status={s} size={12} />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Editable Name ───

function EditableName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onChange(draft); setEditing(false); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
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
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      onKeyDown={(e) => { if (e.key === "Enter") setEditing(true); }}
      className="group/name inline-flex cursor-pointer items-center gap-1"
    >
      <span className="text-sm font-semibold">{value}</span>
      <PencilSimple size={12} className="text-muted-foreground opacity-0 group-hover/name:opacity-100" />
    </span>
  );
}

// ─── Expandable Item Card with Inner Tabs (restored from v1) ───

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
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[item.status];
  const total = getTotalCost(item);
  const cb = item.costBreakdown;
  const budget = item.budget || 0;
  const diff = budget - total;
  const stageLabels: Record<string, string> = { reference: "참고", before: "시공 전", during: "시공 중", after: "시공 후" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="overflow-hidden rounded-xl ring-1 ring-border transition-shadow hover:shadow-sm"
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/30"
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
          <StatusIcon status={item.status} />
        </div>
        <div className="min-w-0 flex-1">
          <EditableName value={item.category} onChange={(name) => onUpdate({ category: name })} />
          <p className="truncate text-[11px] text-muted-foreground">
            {item.decision || (item.candidates?.length ? `후보 ${item.candidates.length}개` : "미결정")}
            {total > 0 && ` · ${formatWon(total)}`}
            {item.photos && item.photos.length > 0 && ` · 사진 ${item.photos.length}`}
          </p>
        </div>
        <StatusSelector status={item.status} onChange={(s) => onUpdate({ status: s })} />
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <CaretDown size={16} className="text-muted-foreground" />
        </motion.div>
      </div>

      {/* Expanded: inner tabs */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="space-y-3 border-t border-border px-3 pb-3 pt-3">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="h-8 w-full justify-start">
                  <TabsTrigger value="info" className="h-6 px-2 text-[10px]">정보</TabsTrigger>
                  <TabsTrigger value="cost" className="h-6 px-2 text-[10px]">비용</TabsTrigger>
                  <TabsTrigger value="photos" className="h-6 px-2 text-[10px]">사진{item.photos?.length ? ` (${item.photos.length})` : ""}</TabsTrigger>
                  <TabsTrigger value="candidates" className="h-6 px-2 text-[10px]">후보{item.candidates?.length ? ` (${item.candidates.length})` : ""}</TabsTrigger>
                  <TabsTrigger value="memo" className="h-6 px-2 text-[10px]">메모{item.memos?.length ? ` (${item.memos.length})` : ""}</TabsTrigger>
                </TabsList>

                {/* Info tab */}
                <TabsContent value="info" className="mt-3 space-y-3">
                  {item.spec && (
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="mb-2 text-[11px] font-semibold text-muted-foreground">자재 스펙</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        {item.spec.width && <div><span className="text-muted-foreground">사이즈</span> <span className="ml-1 font-medium">{item.spec.width}{item.spec.height && ` × ${item.spec.height}`}</span></div>}
                        {item.spec.area && <div><span className="text-muted-foreground">면적</span> <span className="ml-1 font-medium">{item.spec.area}</span></div>}
                        {item.spec.color && <div><span className="text-muted-foreground">색상</span> <span className="ml-1 font-medium">{item.spec.color}</span></div>}
                        {item.spec.modelName && <div><span className="text-muted-foreground">모델</span> <span className="ml-1 font-medium">{item.spec.modelName}</span></div>}
                        {item.spec.productCode && <div><span className="text-muted-foreground">코드</span> <span className="ml-1 font-mono font-medium">{item.spec.productCode}</span></div>}
                        {item.spec.quantity && <div><span className="text-muted-foreground">수량</span> <span className="ml-1 font-medium">{item.spec.quantity}</span></div>}
                      </div>
                    </div>
                  )}
                  {(item.contractor || item.constructionDate) && (
                    <div className="rounded-lg bg-muted/40 p-3 text-[11px] space-y-1.5">
                      <p className="mb-1 font-semibold text-muted-foreground">시공 정보</p>
                      {item.contractor && <div className="flex justify-between"><span className="text-muted-foreground">업자</span><span className="font-medium">{item.contractor.name}</span></div>}
                      {item.contractor?.phone && <div className="flex justify-between"><span className="text-muted-foreground">연락처</span><span>{item.contractor.phone}</span></div>}
                      {item.contractor?.specialty && <div className="flex justify-between"><span className="text-muted-foreground">전문</span><span>{item.contractor.specialty}</span></div>}
                      {item.contractor?.rating && <div className="flex justify-between"><span className="text-muted-foreground">평가</span><Stars rating={item.contractor.rating} /></div>}
                      {item.constructionDate && <div className="flex justify-between"><span className="text-muted-foreground">시공일</span><span>{item.constructionDate}{item.constructionEndDate && ` ~ ${item.constructionEndDate}`}</span></div>}
                      {item.constructionNotes && <div className="mt-1 rounded bg-amber-50 p-2 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"><Warning size={11} className="mb-0.5 inline" /> {item.constructionNotes}</div>}
                    </div>
                  )}
                  {item.showrooms && item.showrooms.length > 0 && item.showrooms.map((s) => (
                    <div key={s.id} className="rounded-lg bg-muted/40 p-3 text-[11px] space-y-1">
                      <div className="flex items-center justify-between"><span className="font-semibold">{s.name}</span>{s.rating && <Stars rating={s.rating} />}</div>
                      <p className="text-muted-foreground">{s.address}</p>
                      <div className="flex gap-3 text-muted-foreground">
                        {s.phone && <span className="flex items-center gap-1"><Phone size={10} />{s.phone}</span>}
                        {s.distanceKm && <span>{s.distanceKm}km</span>}
                      </div>
                      {s.notes && <p className="italic text-muted-foreground">"{s.notes}"</p>}
                    </div>
                  ))}
                  {item.history && item.history.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold text-muted-foreground">변경 이력</p>
                      <div className="relative space-y-0 pl-4">
                        <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
                        {item.history.map((h, i) => (
                          <div key={h.id} className="relative flex gap-3 pb-2.5 last:pb-0">
                            <div className={`absolute left-[-11px] top-1 h-2 w-2 rounded-full ring-2 ring-background ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                            <div><p className="text-[11px]">{h.action}</p><p className="text-[9px] text-muted-foreground">{h.date} · {h.user}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!item.spec && !item.contractor && !item.showrooms?.length && !item.history?.length && (
                    <p className="py-3 text-center text-xs text-muted-foreground">등록된 정보가 없습니다</p>
                  )}
                </TabsContent>

                {/* Cost tab */}
                <TabsContent value="cost" className="mt-3">
                  <div className="rounded-lg bg-muted/40 p-3 text-[11px] space-y-1.5">
                    {cb?.material && <div className="flex justify-between"><span className="text-muted-foreground">자재비</span><span className="font-medium">{formatWon(cb.material)}</span></div>}
                    {cb?.labor && <div className="flex justify-between"><span className="text-muted-foreground">시공비</span><span className="font-medium">{formatWon(cb.labor)}</span></div>}
                    {cb?.delivery && <div className="flex justify-between"><span className="text-muted-foreground">배송비</span><span className="font-medium">{formatWon(cb.delivery)}</span></div>}
                    {total > 0 && <><Separator className="my-1" /><div className="flex justify-between font-semibold"><span>합계</span><span>{formatWon(total)}</span></div></>}
                    {budget > 0 && <div className="flex justify-between"><span className="text-muted-foreground">예산</span><span>{formatWon(budget)}</span></div>}
                    {total > 0 && budget > 0 && <div className={`flex justify-between font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}><span>차이</span><span>{diff >= 0 ? `${formatWon(diff)} 절감` : `${formatWon(Math.abs(diff))} 초과`}</span></div>}
                    {!total && !budget && <p className="text-muted-foreground">비용 정보 없음</p>}
                  </div>
                </TabsContent>

                {/* Photos tab */}
                <TabsContent value="photos" className="mt-3">
                  {(!item.photos || item.photos.length === 0) ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-6">
                      <ImageIcon size={24} className="text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">사진이 없습니다</p>
                      <Button variant="outline" size="sm" className="gap-1"><Plus size={12} />사진 추가</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-muted-foreground">사진 ({item.photos.length})</p>
                        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]"><Plus size={10} />추가</Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {item.photos.map((p) => (
                          <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                            <div className="flex h-full items-center justify-center"><Camera size={18} className="text-muted-foreground/20" /></div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                              <span className="text-[9px] font-medium text-white">{stageLabels[p.stage]}</span>
                              {p.date && <span className="ml-1 text-[8px] text-white/70">{p.date}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Candidates tab */}
                <TabsContent value="candidates" className="mt-3">
                  {(!item.candidates || item.candidates.length === 0) ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-4">
                      <ListDashes size={20} className="text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">후보 제품 없음</p>
                      <Button variant="outline" size="sm" className="gap-1"><Plus size={12} />후보 추가</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-muted-foreground">후보 ({item.candidates.length})</p>
                        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]"><Plus size={10} />추가</Button>
                      </div>
                      {item.candidates.map((c) => (
                        <div key={c.id} className={`rounded-lg p-3 ring-1 ${c.isSelected ? "bg-emerald-50 ring-emerald-300 dark:bg-emerald-900/20 dark:ring-emerald-700" : "bg-card ring-border"}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold">{c.name}</p>
                                {c.isSelected && <Badge variant="default" className="h-4 px-1.5 text-[8px]">선택됨</Badge>}
                              </div>
                              {c.brand && <p className="text-[10px] text-muted-foreground">{c.brand}</p>}
                            </div>
                            {c.price && <p className="text-xs font-bold">{formatWon(c.price)}</p>}
                          </div>
                          {c.rating && <div className="mt-1"><Stars rating={c.rating} /></div>}
                          {(c.pros || c.cons) && (
                            <div className="mt-2 space-y-1 text-[10px]">
                              {c.pros && <p className="text-emerald-600 dark:text-emerald-400">+ {c.pros}</p>}
                              {c.cons && <p className="text-red-500 dark:text-red-400">- {c.cons}</p>}
                            </div>
                          )}
                          {!c.isSelected && (
                            <Button variant="outline" size="sm" className="mt-2 h-6 gap-1 text-[10px]" onClick={() => toast.success(`"${c.name}"으로 결정!`)}>
                              <Check size={10} />이걸로 결정
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Memo tab */}
                <TabsContent value="memo" className="mt-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-muted-foreground">메모 ({item.memos?.length || 0})</p>
                      <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]"><Plus size={10} />추가</Button>
                    </div>
                    {(!item.memos || item.memos.length === 0) ? (
                      <p className="py-3 text-center text-[11px] text-muted-foreground">메모가 없습니다</p>
                    ) : (
                      item.memos.map((m) => (
                        <div key={m.id} className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs">{m.content}</p>
                          <p className="mt-1 text-[9px] text-muted-foreground">{m.date} · {m.user}</p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex items-center justify-end border-t border-dashed border-border pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash size={12} />항목 삭제
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Room-level tabs: All Photos ───

function AllPhotosTab({ items }: { items: BoardItem[] }) {
  const allPhotos = items.flatMap((item) =>
    (item.photos || []).map((p) => ({ ...p, itemCategory: item.category }))
  );
  const [filter, setFilter] = useState<string>("all");
  const stageLabels: Record<string, string> = { reference: "참고", before: "시공 전", during: "시공 중", after: "시공 후" };
  const filtered = filter === "all" ? allPhotos : allPhotos.filter((p) => p.stage === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["all", "reference", "before", "during", "after"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
          >
            {s === "all" ? `전체 (${allPhotos.length})` : `${stageLabels[s]} (${allPhotos.filter((p) => p.stage === s).length})`}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <ImageIcon size={28} className="text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">사진이 없습니다</p>
          <Button variant="outline" size="sm" className="gap-1"><Plus size={12} />사진 추가</Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {filtered.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
              <div className="flex h-full items-center justify-center"><Camera size={24} className="text-muted-foreground/20" /></div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-[10px] font-medium text-white">{photo.itemCategory}</p>
                <p className="text-[9px] text-white/70">{stageLabels[photo.stage]}{photo.date && ` · ${photo.date}`}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Room-level tabs: Cost Table ───

function CostTableTab({ items, roomColor }: { items: BoardItem[]; roomColor: string }) {
  const totalBudget = items.reduce((s, i) => s + (i.budget || 0), 0);
  const totalActual = items.reduce((s, i) => s + getTotalCost(i), 0);
  const totalMaterial = items.reduce((s, i) => s + (i.costBreakdown?.material || 0), 0);
  const totalLabor = items.reduce((s, i) => s + (i.costBreakdown?.labor || 0), 0);
  const totalDelivery = items.reduce((s, i) => s + (i.costBreakdown?.delivery || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-border">
          <p className="text-lg font-bold" style={{ color: roomColor }}>{totalBudget > 0 ? formatWon(totalBudget) : "-"}</p>
          <p className="text-[10px] text-muted-foreground">총 예산</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-border">
          <p className="text-lg font-bold text-emerald-600">{totalActual > 0 ? formatWon(totalActual) : "-"}</p>
          <p className="text-[10px] text-muted-foreground">총 지출</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-border">
          <p className="text-lg font-bold">{totalMaterial > 0 ? formatWon(totalMaterial) : "-"}</p>
          <p className="text-[10px] text-muted-foreground">자재비</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-border">
          <p className="text-lg font-bold">{totalLabor > 0 ? formatWon(totalLabor) : "-"}</p>
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
                  <td className="px-3 py-2 text-right text-muted-foreground">{item.budget ? formatWon(item.budget) : "-"}</td>
                  <td className="px-3 py-2 text-right">{item.costBreakdown?.material ? formatWon(item.costBreakdown.material) : "-"}</td>
                  <td className="px-3 py-2 text-right">{item.costBreakdown?.labor ? formatWon(item.costBreakdown.labor) : "-"}</td>
                  <td className="px-3 py-2 text-right">{item.costBreakdown?.delivery ? formatWon(item.costBreakdown.delivery) : "-"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{t > 0 ? formatWon(t) : "-"}</td>
                  <td className={`px-3 py-2 text-right font-medium ${t > 0 && item.budget ? (d >= 0 ? "text-emerald-600" : "text-red-500") : "text-muted-foreground"}`}>
                    {t > 0 && item.budget ? (d >= 0 ? `-${formatWon(d)}` : `+${formatWon(Math.abs(d))}`) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 font-semibold">
              <td className="px-3 py-2">합계</td>
              <td className="px-3 py-2 text-right">{totalBudget > 0 ? formatWon(totalBudget) : "-"}</td>
              <td className="px-3 py-2 text-right">{totalMaterial > 0 ? formatWon(totalMaterial) : "-"}</td>
              <td className="px-3 py-2 text-right">{totalLabor > 0 ? formatWon(totalLabor) : "-"}</td>
              <td className="px-3 py-2 text-right">{totalDelivery > 0 ? formatWon(totalDelivery) : "-"}</td>
              <td className="px-3 py-2 text-right">{totalActual > 0 ? formatWon(totalActual) : "-"}</td>
              <td className={`px-3 py-2 text-right ${totalBudget - totalActual >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {totalActual > 0 ? (totalBudget - totalActual >= 0 ? `-${formatWon(totalBudget - totalActual)}` : `+${formatWon(Math.abs(totalBudget - totalActual))}`) : "-"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Room-level tabs: All Memos ───

function AllMemosTab({ items }: { items: BoardItem[] }) {
  const allMemos = items.flatMap((item) =>
    (item.memos || []).map((m) => ({ ...m, itemCategory: item.category }))
  ).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{allMemos.length}개 메모</p>
        <Button variant="outline" size="sm" className="gap-1"><Plus size={12} />메모 추가</Button>
      </div>
      {allMemos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Note size={28} className="text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">메모가 없습니다</p>
        </div>
      ) : (
        allMemos.map((m) => (
          <div key={m.id} className="rounded-xl bg-card p-3 ring-1 ring-border">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[9px]">{m.itemCategory}</Badge>
              <span className="text-[10px] text-muted-foreground">{m.date} · {m.user}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed">{m.content}</p>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Main: Room Detail View ───

export function RoomDetailView({
  room,
  onBack,
}: {
  room: Room;
  onBack: () => void;
}) {
  const [items, setItems] = useState(room.items);

  const totalBudget = items.reduce((s, i) => s + (i.budget || 0), 0);
  const totalActual = items.reduce((s, i) => s + getTotalCost(i), 0);
  const decidedCount = items.filter(
    (i) => i.status === "decided" || i.status === "purchased" || i.status === "installed"
  ).length;
  const progress = items.length > 0
    ? Math.round(items.reduce((sum, item) => {
        const w: Record<Status, number> = { undecided: 0, has_candidates: 25, decided: 50, purchased: 75, installed: 100 };
        return sum + w[item.status];
      }, 0) / items.length)
    : 0;

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("삭제했습니다.");
  };

  const handleAddItem = () => {
    const newItem: BoardItem = {
      id: `new-${Date.now()}`,
      category: "새 항목",
      status: "undecided",
      history: [{ id: `h-${Date.now()}`, date: new Date().toISOString().split("T")[0], action: "항목 생성", user: "성훈" }],
    };
    setItems((prev) => [...prev, newItem]);
    toast.success("항목을 추가했습니다.");
  };

  const handleUpdateItem = (id: string, updates: Partial<BoardItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
          <ArrowLeft size={16} />
        </Button>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: room.color + "20", color: room.color }}
        >
          {ROOM_ICONS[room.iconKey]}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight">{room.name}</h2>
          <p className="text-xs text-muted-foreground">
            {decidedCount}/{items.length} 결정 · 예산 {formatWon(totalBudget)}
            {totalActual > 0 && ` · 지출 ${formatWon(totalActual)}`}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">진행률</span>
          <span className="font-bold" style={{ color: room.color }}>{progress}%</span>
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

      {/* Room-level tabs */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="items">항목 ({items.length})</TabsTrigger>
          <TabsTrigger value="photos">사진 ({items.reduce((s, i) => s + (i.photos?.length || 0), 0)})</TabsTrigger>
          <TabsTrigger value="cost">비용</TabsTrigger>
          <TabsTrigger value="memos">메모 ({items.reduce((s, i) => s + (i.memos?.length || 0), 0)})</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{items.length}개 항목</p>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleAddItem}>
                <Plus size={14} />추가
              </Button>
            </div>
            <AnimatePresence>
              {items.map((item, i) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  onDelete={() => handleDeleteItem(item.id)}
                  onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                />
              ))}
            </AnimatePresence>
            {items.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Circle size={32} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">항목이 없습니다</p>
                <Button variant="outline" onClick={handleAddItem} className="gap-1"><Plus size={14} />첫 항목 추가</Button>
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
