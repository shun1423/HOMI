"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Star,
  StarHalf,
  Check,
  X,
  Plus,
  Trash,
  ArrowSquareOut,
  Package,
  Table as TableIcon,
  SquaresFour,
  DotsThree,
  CheckCircle,
  PencilSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAllCandidates,
  useCreateCandidate,
  useUpdateCandidate,
  useDeleteCandidate,
  useUpdateBoardItem,
  useBoardItems,
  useSpaces,
  type CandidateWithContext,
} from "@/lib/queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number) {
  if (price >= 10000) {
    const man = Math.floor(price / 10000);
    const rest = price % 10000;
    return rest > 0 ? `${man}만 ${rest.toLocaleString()}원` : `${man}만원`;
  }
  return `${price.toLocaleString()}원`;
}

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className="flex items-center gap-px">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} weight="fill" className="size-3 text-amber-500" />
      ))}
      {hasHalf && <StarHalf weight="fill" className="size-3 text-amber-500" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} weight="duotone" className="size-3 text-muted-foreground/20" />
      ))}
      <span className="ml-1 text-[11px] text-muted-foreground">{rating}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComparisonGroup {
  key: string;
  spaceName: string;
  spaceColor: string | null;
  category: string;
  boardItemId: string;
  candidates: CandidateWithContext[];
  hasDecided: boolean;
}

type ViewMode = "card" | "table";

// ---------------------------------------------------------------------------
// Candidate Card — follows RoomCard pattern (rounded-2xl, ring-1, p-4)
// ---------------------------------------------------------------------------

function CandidateCard({
  candidate,
  index,
  isLowest,
  onDecide,
  onDelete,
  onUndecide,
  onEdit,
}: {
  candidate: CandidateWithContext;
  index: number;
  isLowest: boolean;
  onDecide: () => void;
  onDelete: () => void;
  onUndecide: () => void;
  onEdit: () => void;
}) {
  const pros = candidate.pros?.split("\n").filter(Boolean) ?? [];
  const cons = candidate.cons?.split("\n").filter(Boolean) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={`overflow-hidden rounded-2xl bg-card ring-1 transition-shadow hover:shadow-lg ${
        candidate.is_selected ? "ring-2 ring-emerald-500" : "ring-border"
      }`}
    >
      <div className="p-4 space-y-2.5">
        {/* 이름 + 결정 뱃지 + 메뉴 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold leading-tight truncate">{candidate.name}</h3>
              {candidate.is_selected && (
                <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
                  <CheckCircle weight="fill" className="size-3" />
                  결정
                </span>
              )}
            </div>
            {candidate.brand && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{candidate.brand}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="shrink-0 -mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:bg-muted hover:text-foreground">
                  <DotsThree weight="bold" className="size-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem onClick={onEdit}>
                <PencilSimple className="size-4" /> 편집
              </DropdownMenuItem>
              {candidate.purchase_url && (
                <DropdownMenuItem onClick={() => window.open(candidate.purchase_url!, "_blank")}>
                  <ArrowSquareOut className="size-4" /> 구매 링크
                </DropdownMenuItem>
              )}
              {candidate.is_selected && (
                <DropdownMenuItem onClick={onUndecide}>
                  <X className="size-4" /> 결정 취소
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => { if (confirm("이 후보를 삭제하시겠습니까?")) onDelete(); }}
              >
                <Trash className="size-4" /> 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 가격 */}
        {candidate.price != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tabular-nums">{formatPrice(candidate.price)}</span>
            {isLowest && (
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded px-1 py-0.5">
                최저가
              </span>
            )}
          </div>
        )}

        {/* 단가 × 수량 */}
        {candidate.unit_price != null && candidate.quantity != null && (
          <p className="text-[11px] text-muted-foreground">
            {formatPrice(candidate.unit_price)}
            {candidate.price_unit && ` ${candidate.price_unit}`}
            {" × "}
            {candidate.quantity}개
          </p>
        )}

        {/* 평점 */}
        {candidate.rating != null && <RatingStars rating={candidate.rating} />}

        {/* 장단점 */}
        {(pros.length > 0 || cons.length > 0) && (
          <div className="space-y-2 border-t border-dashed border-border pt-2.5">
            {pros.length > 0 && (
              <div className="space-y-0.5">
                {pros.map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <span className="text-emerald-500 mt-px shrink-0">+</span>
                    <span className="leading-relaxed">{p}</span>
                  </div>
                ))}
              </div>
            )}
            {cons.length > 0 && (
              <div className="space-y-0.5">
                {cons.map((c, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <span className="text-red-400 mt-px shrink-0">-</span>
                    <span className="leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 메모 */}
        {candidate.notes && (
          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-2 leading-relaxed">
            {candidate.notes}
          </p>
        )}

        {/* 결정 버튼 */}
        {!candidate.is_selected && (
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={onDecide}>
            이걸로 결정
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Table View
// ---------------------------------------------------------------------------

function CompareTableView({
  candidates,
  lowestId,
  onDecide,
  onUndecide,
  onEdit,
}: {
  candidates: CandidateWithContext[];
  lowestId: string | null;
  onDecide: (c: CandidateWithContext) => void;
  onUndecide: (c: CandidateWithContext) => void;
  onEdit: (c: CandidateWithContext) => void;
}) {
  const rows: { label: string; render: (c: CandidateWithContext) => React.ReactNode }[] = [
    {
      label: "브랜드",
      render: (c) => c.brand || <span className="text-muted-foreground/30">—</span>,
    },
    {
      label: "가격",
      render: (c) =>
        c.price != null ? (
          <span className={c.id === lowestId ? "text-emerald-600 font-semibold" : "font-medium"}>
            {formatPrice(c.price)}
          </span>
        ) : <span className="text-muted-foreground/30">—</span>,
    },
    {
      label: "평점",
      render: (c) => c.rating != null ? <RatingStars rating={c.rating} /> : <span className="text-muted-foreground/30">—</span>,
    },
    {
      label: "장점",
      render: (c) => {
        const list = c.pros?.split("\n").filter(Boolean) ?? [];
        if (!list.length) return <span className="text-muted-foreground/30">—</span>;
        return list.map((p, i) => (
          <div key={i} className="flex items-start gap-1 mb-0.5">
            <Check weight="bold" className="size-2.5 text-emerald-500 mt-0.5 shrink-0" />{p}
          </div>
        ));
      },
    },
    {
      label: "단점",
      render: (c) => {
        const list = c.cons?.split("\n").filter(Boolean) ?? [];
        if (!list.length) return <span className="text-muted-foreground/30">—</span>;
        return list.map((co, i) => (
          <div key={i} className="flex items-start gap-1 mb-0.5">
            <X weight="bold" className="size-2.5 text-red-400 mt-0.5 shrink-0" />{co}
          </div>
        ));
      },
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[480px]">
        <thead>
          <tr className="border-b">
            <th className="text-left font-medium text-muted-foreground py-2 pr-4 w-14" />
            {candidates.map((c) => (
              <th key={c.id} className="text-left font-semibold py-2 px-3">
                <button
                  onClick={() => onEdit(c)}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors text-left"
                >
                  {c.is_selected && <CheckCircle weight="fill" className="size-3 text-emerald-500" />}
                  <span className="truncate">{c.name}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-foreground/5">
              <td className="text-muted-foreground font-medium py-2.5 pr-4 align-top whitespace-nowrap">{row.label}</td>
              {candidates.map((c) => (
                <td key={c.id} className="py-2.5 px-3 align-top">{row.render(c)}</td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="py-2.5 pr-4" />
            {candidates.map((c) => (
              <td key={c.id} className="py-2.5 px-3">
                {c.is_selected ? (
                  <button onClick={() => onUndecide(c)} className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1">
                    <Check weight="bold" className="size-3" /> 결정됨
                  </button>
                ) : (
                  <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => onDecide(c)}>결정</Button>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate Form Dialog (add + edit)
// ---------------------------------------------------------------------------

function CandidateFormDialog({
  open,
  onOpenChange,
  boardItemId,
  candidate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  boardItemId: string;
  candidate?: CandidateWithContext;
  onDelete?: (c: CandidateWithContext) => void;
}) {
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  const isEditing = !!candidate;

  const [name, setName] = useState(candidate?.name ?? "");
  const [brand, setBrand] = useState(candidate?.brand ?? "");
  const [unitPrice, setUnitPrice] = useState(candidate?.unit_price != null ? String(candidate.unit_price) : "");
  const [quantity, setQuantity] = useState(candidate?.quantity != null ? String(candidate.quantity) : "");
  const [price, setPrice] = useState(candidate?.price != null ? String(candidate.price) : "");
  const [rating, setRating] = useState(candidate?.rating != null ? String(candidate.rating) : "");
  const [pros, setPros] = useState(candidate?.pros ?? "");
  const [cons, setCons] = useState(candidate?.cons ?? "");
  const [purchaseUrl, setPurchaseUrl] = useState(candidate?.purchase_url ?? "");
  const [notes, setNotes] = useState(candidate?.notes ?? "");

  const autoTotal = unitPrice && quantity ? Number(unitPrice) * Number(quantity) : null;
  const finalPrice = price ? Number(price) : autoTotal;
  const isPending = createCandidate.isPending || updateCandidate.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("제품명을 입력해주세요"); return; }

    const payload = {
      name: name.trim(),
      brand: brand.trim() || null,
      price: finalPrice,
      unit_price: unitPrice ? Number(unitPrice) : null,
      quantity: quantity ? Number(quantity) : null,
      rating: rating ? Number(rating) : null,
      pros: pros.trim() || null,
      cons: cons.trim() || null,
      purchase_url: purchaseUrl.trim() || null,
      notes: notes.trim() || null,
    };

    if (isEditing) {
      updateCandidate.mutate(
        { id: candidate.id, board_item_id: candidate.board_item_id, ...payload },
        {
          onSuccess: () => { toast.success("후보가 수정되었습니다"); onOpenChange(false); },
          onError: () => toast.error("수정에 실패했습니다"),
        }
      );
    } else {
      createCandidate.mutate(
        { board_item_id: boardItemId, ...payload },
        {
          onSuccess: () => {
            toast.success("후보가 추가되었습니다"); onOpenChange(false);
            setName(""); setBrand(""); setUnitPrice(""); setQuantity("");
            setPrice(""); setRating(""); setPros(""); setCons("");
            setPurchaseUrl(""); setNotes("");
          },
          onError: () => toast.error("후보 추가에 실패했습니다"),
        }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "후보 수정" : "후보 추가"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "제품 정보를 수정합니다" : "비교할 새로운 제품을 추가합니다"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">제품명 *</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="프리미엄 포세린 타일" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-brand">브랜드</Label>
              <Input id="c-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="대림바스" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-rating">평점 (0~5)</Label>
              <Input id="c-rating" type="number" min={0} max={5} step={0.5} value={rating} onChange={(e) => setRating(e.target.value)} placeholder="4.5" />
            </div>
          </div>
          <fieldset className="rounded-lg border p-3 space-y-2">
            <legend className="text-xs font-medium text-muted-foreground px-1">가격</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="c-up" className="text-[11px]">단가 (원)</Label>
                <Input id="c-up" type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="15000" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-qty" className="text-[11px]">수량</Label>
                <Input id="c-qty" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-price" className="text-[11px]">
                총 가격
                {autoTotal != null && !price && <span className="text-primary ml-1 font-normal">= {formatPrice(autoTotal)}</span>}
              </Label>
              <Input id="c-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={autoTotal != null ? String(autoTotal) : "320000"} />
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-pros">장점</Label>
              <Textarea id="c-pros" value={pros} onChange={(e) => setPros(e.target.value)} placeholder={"디자인 세련됨\n내구성 좋음"} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-cons">단점</Label>
              <Textarea id="c-cons" value={cons} onChange={(e) => setCons(e.target.value)} placeholder={"가격 높은 편\n배송 느림"} rows={2} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-url">구매 링크</Label>
            <Input id="c-url" value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-notes">메모</Label>
            <Input id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="추가 메모" />
          </div>
          <DialogFooter className={isEditing && onDelete ? "flex justify-between sm:justify-between" : ""}>
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("이 후보를 삭제하시겠습니까?")) {
                    onDelete(candidate);
                    onOpenChange(false);
                  }
                }}
              >
                <Trash className="size-4" /> 삭제
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "저장 중..." : isEditing ? "수정" : "추가"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CompareLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComparePage() {
  const { data: allCandidates, isLoading: candidatesLoading } = useAllCandidates();
  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const { data: boardItems, isLoading: boardItemsLoading } = useBoardItems();

  const updateCandidate = useUpdateCandidate();
  const deleteCandidate = useDeleteCandidate();
  const updateBoardItem = useUpdateBoardItem();

  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<CandidateWithContext | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [confirmTarget, setConfirmTarget] = useState<CandidateWithContext | null>(null);

  const isLoading = candidatesLoading || spacesLoading || boardItemsLoading;

  const groups = useMemo<ComparisonGroup[]>(() => {
    if (!allCandidates?.length) return [];
    const map = new Map<string, CandidateWithContext[]>();
    for (const c of allCandidates) {
      const list = map.get(c.board_item_id) ?? [];
      list.push(c);
      map.set(c.board_item_id, list);
    }
    return Array.from(map.entries()).map(([boardItemId, candidates]) => {
      const f = candidates[0];
      return {
        key: `${f.space.id}::${boardItemId}`,
        spaceName: f.space.name,
        spaceColor: f.space.color,
        category: f.board_item.category,
        boardItemId,
        candidates,
        hasDecided: candidates.some((c) => c.is_selected),
      };
    });
  }, [allCandidates]);

  const activeKey = activeGroupKey && groups.find((g) => g.key === activeGroupKey)
    ? activeGroupKey : groups[0]?.key ?? null;
  const activeGroup = groups.find((g) => g.key === activeKey);

  const lowestPriceId = useMemo(() => {
    if (!activeGroup) return null;
    const wp = activeGroup.candidates.filter((c) => c.price != null);
    if (wp.length < 2) return null;
    const min = Math.min(...wp.map((c) => c.price!));
    return wp.find((c) => c.price === min)?.id ?? null;
  }, [activeGroup]);

  const priceRange = useMemo(() => {
    if (!activeGroup) return null;
    const p = activeGroup.candidates.filter((c) => c.price != null).map((c) => c.price!);
    if (!p.length) return null;
    return { min: Math.min(...p), max: Math.max(...p) };
  }, [activeGroup]);

  async function handleDecide(candidate: CandidateWithContext) {
    try {
      const siblings = activeGroup?.candidates.filter((c) => c.id !== candidate.id && c.is_selected) ?? [];
      for (const s of siblings) await updateCandidate.mutateAsync({ id: s.id, board_item_id: s.board_item_id, is_selected: false });
      await updateCandidate.mutateAsync({ id: candidate.id, board_item_id: candidate.board_item_id, is_selected: true });
      await updateBoardItem.mutateAsync({
        id: candidate.board_item_id, status: "decided",
        decision_content: `${candidate.name}${candidate.brand ? ` (${candidate.brand})` : ""}`,
      });
      toast.success(`"${candidate.name}"으로 결정되었습니다`);
    } catch { toast.error("결정 처리 중 오류가 발생했습니다"); }
    setConfirmTarget(null);
  }

  async function handleUndecide(candidate: CandidateWithContext) {
    try {
      await updateCandidate.mutateAsync({ id: candidate.id, board_item_id: candidate.board_item_id, is_selected: false });
      await updateBoardItem.mutateAsync({ id: candidate.board_item_id, status: "has_candidates", decision_content: null });
      toast.success("결정이 취소되었습니다");
    } catch { toast.error("결정 취소 중 오류가 발생했습니다"); }
  }

  function handleDelete(candidate: CandidateWithContext) {
    deleteCandidate.mutate(
      { id: candidate.id, boardItemId: candidate.board_item_id },
      { onSuccess: () => toast.success("후보가 삭제되었습니다"), onError: () => toast.error("삭제에 실패했습니다") }
    );
  }

  if (isLoading) return <CompareLoadingSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-bold">제품 비교</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              공간별 자재/설비 후보 비교 · {groups.length}개 그룹
            </p>
          </div>
          {activeGroup && (
            <Button size="default" onClick={() => { setEditingCandidate(undefined); setFormOpen(true); }}>
              <Plus weight="bold" className="size-4" />
              후보 추가
            </Button>
          )}
        </motion.div>

        {groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Package weight="duotone" className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">비교할 후보가 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">보드 아이템에서 후보를 추가해주세요</p>
          </motion.div>
        ) : (
          <>
            {/* 그룹 선택 — 가로 스크롤 pills */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center gap-2 overflow-x-auto pb-1"
            >
              {groups.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setActiveGroupKey(g.key)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    g.key === activeKey
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g.spaceName} · {g.category}
                  <span className="opacity-60">{g.candidates.length}</span>
                  {g.hasDecided && <Check weight="bold" className="size-3" />}
                </button>
              ))}
            </motion.div>

            {/* 비교 영역 */}
            {activeGroup && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                {/* 서브헤더: 제목 + 가격범위 + 뷰 토글 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">
                      {activeGroup.spaceName} · {activeGroup.category}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeGroup.candidates.length}개 후보
                      {priceRange && priceRange.min !== priceRange.max &&
                        ` · ${formatPrice(priceRange.min)} ~ ${formatPrice(priceRange.max)}`}
                    </p>
                  </div>
                  <div className="flex items-center overflow-hidden rounded-lg border">
                    <button
                      onClick={() => setViewMode("card")}
                      className={`p-1.5 transition-colors ${
                        viewMode === "card"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <SquaresFour className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 transition-colors ${
                        viewMode === "table"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <TableIcon className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* 카드 or 테이블 */}
                {viewMode === "card" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {activeGroup.candidates.map((c, i) => (
                      <CandidateCard
                        key={c.id}
                        candidate={c}
                        index={i}
                        isLowest={c.id === lowestPriceId}
                        onDecide={() => setConfirmTarget(c)}
                        onDelete={() => handleDelete(c)}
                        onUndecide={() => handleUndecide(c)}
                        onEdit={() => { setEditingCandidate(c); setFormOpen(true); }}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent>
                      <CompareTableView
                        candidates={activeGroup.candidates}
                        lowestId={lowestPriceId}
                        onDecide={(c) => setConfirmTarget(c)}
                        onUndecide={handleUndecide}
                        onEdit={(c) => { setEditingCandidate(c); setFormOpen(true); }}
                      />
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </>
        )}

        {/* 결정 확인 */}
        <Dialog open={!!confirmTarget} onOpenChange={(v) => { if (!v) setConfirmTarget(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>결정 확인</DialogTitle>
              <DialogDescription>
                {confirmTarget && (
                  <>
                    <span className="font-medium text-foreground">{confirmTarget.name}</span>
                    {confirmTarget.brand && ` (${confirmTarget.brand})`}
                    {confirmTarget.price != null && ` · ${formatPrice(confirmTarget.price)}`}
                    <br />이 제품으로 결정하시겠습니까?
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmTarget(null)}>취소</Button>
              <Button onClick={() => confirmTarget && handleDecide(confirmTarget)}>
                <Check weight="bold" className="size-4" /> 결정
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {activeGroup && formOpen && (
          <CandidateFormDialog
            key={editingCandidate?.id ?? "new"}
            open={formOpen}
            onOpenChange={setFormOpen}
            boardItemId={activeGroup.boardItemId}
            candidate={editingCandidate}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
