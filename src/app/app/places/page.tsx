"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MagnifyingGlass,
  MapPin,
  Phone,
  Clock,
  Star,
  NavigationArrow,
  Plus,
  BookmarkSimple,
  CaretDown,
  CaretUp,
  HardHat,
  CalendarBlank,
  Path,
  CheckCircle,
  Circle,
  Notebook,
  ChatCircle,
  Wrench,
  Trash,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  usePlaces,
  useCreatePlace,
  useUpdatePlace,
  useDeletePlace,
  useContractors,
  useCreateContractor,
  useUpdateContractor,
  useDeleteContractor,
  useEstimates,
  useCreateEstimate,
  useContractorHistory,
  useCreateContractorHistory,
  useSchedules,
  useCreateSchedule,
  useScheduleStops,
  useCreateScheduleStop,
  useUpdateScheduleStop,
  useDeleteScheduleStop,
} from "@/lib/queries";
import type {
  Place,
  Contractor,
  VisitStatus,
  Schedule,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLACE_CATEGORIES = [
  "전체",
  "타일",
  "세면대",
  "바닥재",
  "조명",
  "자재",
  "창호",
  "기타",
] as const;

const VISIT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: "not_visited", label: "미방문" },
  { value: "planned", label: "방문예정" },
  { value: "visited", label: "방문완료" },
];

const VISIT_STATUS_ALL = "all";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function visitStatusLabel(status: VisitStatus) {
  return (
    VISIT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  );
}

function visitStatusBadge(status: VisitStatus) {
  const config: Record<VisitStatus, { variant: "secondary" | "outline"; className: string }> = {
    not_visited: { variant: "secondary", className: "" },
    planned: {
      variant: "outline",
      className: "border-chart-4/40 text-chart-4 bg-chart-4/5",
    },
    visited: {
      variant: "outline",
      className: "border-emerald-500/40 text-emerald-600 bg-emerald-500/5",
    },
  };
  const { variant, className } = config[status];
  return (
    <Badge variant={variant} className={`text-[10px] ${className}`}>
      {visitStatusLabel(status)}
    </Badge>
  );
}

function StarRating({
  rating,
  interactive,
  onChange,
}: {
  rating: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rating);
        const icon = (
          <Star
            size={interactive ? 16 : 12}
            weight={filled ? "fill" : "regular"}
            className={star <= rating ? "text-amber-500" : "text-muted-foreground/30"}
          />
        );
        if (interactive) {
          return (
            <button key={star} type="button" onClick={() => onChange?.(star)} className="cursor-pointer">
              {icon}
            </button>
          );
        }
        return <span key={star}>{icon}</span>;
      })}
    </div>
  );
}

function formatKRW(amount: number) {
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

function CardSkeleton() {
  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Places
// ---------------------------------------------------------------------------

function PlacesTab() {
  const { data: places, isLoading } = usePlaces();
  const createPlace = useCreatePlace();
  const updatePlace = useUpdatePlace();
  const deletePlace = useDeletePlace();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [visitFilter, setVisitFilter] = useState<string>(VISIT_STATUS_ALL);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newBusinessHours, setNewBusinessHours] = useState("");
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);

  // Naver search state (auto-search with debounce)
  const [naverQuery, setNaverQuery] = useState("");
  const [naverResults, setNaverResults] = useState<
    { name: string; address: string; phone: string | null; latitude: number | null; longitude: number | null; link: string | null }[]
  >([]);
  const [naverSearching, setNaverSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = naverQuery.trim();
    if (q.length < 2) { setNaverResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setNaverSearching(true);
      try {
        const res = await fetch(`/api/places-search?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        setNaverResults(data.items ?? []);
      } catch { /* ignore */ }
      finally { setNaverSearching(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [naverQuery]);

  function handleSelectNaverResult(result: typeof naverResults[number]) {
    setNewName(result.name);
    setNewAddress(result.address);
    setNewPhone(result.phone ?? "");
    setNewLat(result.latitude);
    setNewLng(result.longitude);
    if (result.link) setNewWebsite(result.link);
    setNaverResults([]);
    setNaverQuery("");
  }

  const filtered = (places ?? []).filter((p) => {
    const matchSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.address ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "전체" || p.category === categoryFilter;
    const matchVisit =
      visitFilter === VISIT_STATUS_ALL || p.visit_status === visitFilter;
    return matchSearch && matchCategory && matchVisit;
  });

  function handleAddPlace() {
    if (!newName.trim()) {
      toast.error("장소명을 입력해주세요");
      return;
    }
    createPlace.mutate(
      {
        name: newName.trim(),
        address: newAddress.trim() || null,
        phone: newPhone.trim() || null,
        category: newCategory || null,
        website_url: newWebsite.trim() || null,
        business_hours: newBusinessHours.trim() || null,
        latitude: newLat,
        longitude: newLng,
      },
      {
        onSuccess: () => {
          toast.success("장소가 추가되었습니다");
          setAddOpen(false);
          setNewName(""); setNewAddress(""); setNewPhone("");
          setNewCategory(""); setNewWebsite(""); setNewBusinessHours("");
          setNewLat(null); setNewLng(null);
        },
        onError: (err) => toast.error(`추가 실패: ${err.message}`),
      }
    );
  }

  function handleToggleBookmark(place: Place) {
    updatePlace.mutate(
      { id: place.id, is_bookmarked: !place.is_bookmarked },
      {
        onSuccess: () =>
          toast.success(
            place.is_bookmarked ? "북마크 해제" : "북마크 추가"
          ),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleUpdateVisitStatus(place: Place, status: VisitStatus) {
    updatePlace.mutate(
      { id: place.id, visit_status: status },
      {
        onSuccess: () => toast.success("방문 상태가 변경되었습니다"),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleUpdateRating(place: Place, rating: number) {
    updatePlace.mutate(
      { id: place.id, rating },
      {
        onSuccess: () => toast.success("평점이 변경되었습니다"),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleDelete(id: string) {
    deletePlace.mutate(id, {
      onSuccess: () => {
        toast.success("장소가 삭제되었습니다");
        setExpandedId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlass
          size={16}
          weight="duotone"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="장소명 또는 주소 검색..."
          className="h-9 rounded-xl pl-9 text-[13px]"
        />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {PLACE_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="xs"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={visitFilter === VISIT_STATUS_ALL ? "default" : "outline"}
            size="xs"
            onClick={() => setVisitFilter(VISIT_STATUS_ALL)}
          >
            전체 상태
          </Button>
          {VISIT_STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={visitFilter === opt.value ? "default" : "outline"}
              size="xs"
              onClick={() => setVisitFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Add button */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger
          render={
            <Button size="sm" className="w-full gap-1.5">
              <Plus size={14} weight="bold" />
              장소 추가
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 장소 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* 네이버 검색 */}
            <div>
              <Label className="text-xs">장소 검색</Label>
              <div className="relative mt-1">
                <MagnifyingGlass size={14} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={naverQuery}
                  onChange={(e) => setNaverQuery(e.target.value)}
                  placeholder="장소명으로 검색 (예: 대림바스 포천)"
                  className="pl-8"
                />
                {naverSearching && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">검색중...</span>
                )}
              </div>
              {naverResults.length > 0 && (
                <div className="mt-2 rounded-lg border divide-y max-h-48 overflow-y-auto">
                  {naverResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors">
                      <button
                        type="button"
                        onClick={() => handleSelectNaverResult(r)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.address}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(r.name + " " + r.address)}`, "_blank")}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="네이버 지도에서 보기"
                      >
                        <MapPin size={14} weight="duotone" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* 기본 정보 */}
            <div>
              <Label className="text-xs">장소명 *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="대림바스 포천 쇼룸" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">주소</Label>
              <div className="flex gap-2 mt-1">
                <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="경기 포천시 신읍동 45-2" className="flex-1" />
                {newAddress.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className="shrink-0 gap-1"
                    onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent((newName.trim() ? newName.trim() + " " : "") + newAddress.trim())}`, "_blank")}
                  >
                    <MapPin size={14} weight="duotone" />
                    지도
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">전화번호</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="031-532-5678" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">카테고리</Label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v ?? "")}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACE_CATEGORIES.filter((c) => c !== "전체").map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">영업시간</Label>
                <Input value={newBusinessHours} onChange={(e) => setNewBusinessHours(e.target.value)} placeholder="09:00~18:00" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">웹사이트</Label>
                <Input value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
            <Button onClick={handleAddPlace} disabled={createPlace.isPending}>
              {createPlace.isPending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Place cards */}
      {!isLoading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <MapPin
            size={40}
            weight="duotone"
            className="mx-auto mb-3 text-muted-foreground/40"
          />
          <p className="text-sm text-muted-foreground">
            {places?.length === 0
              ? "등록된 장소가 없습니다"
              : "조건에 맞는 장소가 없습니다"}
          </p>
        </motion.div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((place, idx) => {
            const isExpanded = expandedId === place.id;
            return (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                layout
              >
                <Card size="sm" className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Main row */}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : place.id)
                      }
                      className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold truncate">
                              {place.name}
                            </h3>
                            {place.category && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] shrink-0"
                              >
                                {place.category}
                              </Badge>
                            )}
                            {visitStatusBadge(place.visit_status)}
                          </div>
                          {place.address && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin size={11} weight="duotone" />
                              <span className="truncate">{place.address}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {place.rating != null && place.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <StarRating rating={place.rating} />
                              <span className="text-[11px] font-semibold">
                                {place.rating}
                              </span>
                            </div>
                          )}
                          {isExpanded ? (
                            <CaretUp
                              size={14}
                              weight="bold"
                              className="text-muted-foreground"
                            />
                          ) : (
                            <CaretDown
                              size={14}
                              weight="bold"
                              className="text-muted-foreground"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        {place.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} weight="duotone" />
                            {place.phone}
                          </span>
                        )}
                        {place.business_hours && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} weight="duotone" />
                            {place.business_hours}
                          </span>
                        )}
                        {place.distance_from_base != null && (
                          <span className="ml-auto flex items-center gap-1 font-medium text-foreground">
                            <NavigationArrow
                              size={11}
                              weight="duotone"
                              className="text-primary"
                            />
                            {place.distance_from_base}km
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <Separator />
                          <PlaceExpandedDetails
                            place={place}
                            onUpdateVisitStatus={(s) =>
                              handleUpdateVisitStatus(place, s)
                            }
                            onUpdateRating={(r) =>
                              handleUpdateRating(place, r)
                            }
                            onToggleBookmark={() =>
                              handleToggleBookmark(place)
                            }
                            onDelete={() => handleDelete(place.id)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlaceExpandedDetails({
  place,
  onUpdateVisitStatus,
  onUpdateRating,
  onToggleBookmark,
  onDelete,
}: {
  place: Place;
  onUpdateVisitStatus: (s: VisitStatus) => void;
  onUpdateRating: (r: number) => void;
  onToggleBookmark: () => void;
  onDelete: () => void;
}) {
  const updatePlace = useUpdatePlace();
  const [notes, setNotes] = useState(place.visit_notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);

  function saveNotes() {
    updatePlace.mutate(
      { id: place.id, visit_notes: notes.trim() || null },
      {
        onSuccess: () => {
          toast.success("메모가 저장되었습니다");
          setEditingNotes(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  return (
    <div className="p-3 space-y-3 bg-muted/10">
      {/* Visit status selector */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          방문 상태
        </span>
        <div className="flex gap-1.5">
          {VISIT_STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={
                place.visit_status === opt.value ? "default" : "outline"
              }
              size="xs"
              onClick={() => onUpdateVisitStatus(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          평점
        </span>
        <StarRating
          rating={place.rating ?? 0}
          interactive
          onChange={onUpdateRating}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          메모
        </span>
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-xs"
              placeholder="방문 메모를 입력하세요..."
            />
            <div className="flex gap-2">
              <Button
                size="xs"
                onClick={saveNotes}
                disabled={updatePlace.isPending}
              >
                저장
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setNotes(place.visit_notes ?? "");
                  setEditingNotes(false);
                }}
              >
                취소
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className="w-full text-left text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
          >
            {place.visit_notes || "메모 추가..."}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {place.address && (
          <Button
            size="xs"
            variant="outline"
            className="gap-1"
            onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(place.name + " " + place.address)}`, "_blank")}
          >
            <MapPin size={12} weight="duotone" />
            지도
          </Button>
        )}
        {place.phone && (
          <Button
            size="xs"
            variant="outline"
            className="gap-1"
            onClick={() => {
              if (/Mobi|Android/i.test(navigator.userAgent)) {
                window.location.href = `tel:${place.phone}`;
              } else {
                navigator.clipboard.writeText(place.phone!);
                toast.success("전화번호가 복사되었습니다");
              }
            }}
          >
            <Phone size={12} weight="duotone" />
            전화
          </Button>
        )}
        {place.website_url && (
          <Button
            size="xs"
            variant="outline"
            className="gap-1"
            onClick={() => window.open(place.website_url!, "_blank")}
          >
            <NavigationArrow size={12} weight="duotone" />
            사이트
          </Button>
        )}
        <Button
          size="xs"
          variant="outline"
          className="gap-1"
          onClick={onToggleBookmark}
        >
          <BookmarkSimple
            size={12}
            weight={place.is_bookmarked ? "fill" : "duotone"}
            className={place.is_bookmarked ? "text-primary" : ""}
          />
          {place.is_bookmarked ? "북마크 해제" : "북마크"}
        </Button>
        <Button
          size="xs"
          variant="outline"
          className="gap-1 text-destructive hover:text-destructive ml-auto"
          onClick={onDelete}
        >
          <Trash size={12} weight="duotone" />
          삭제
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Contractors
// ---------------------------------------------------------------------------

function ContractorsTab() {
  const { data: contractors, isLoading } = useContractors();
  const createContractor = useCreateContractor();

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filtered = (contractors ?? []).filter((c) => {
    if (search === "") return true;
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.specialty.some((s) => s.includes(search))
    );
  });

  function handleAddContractor() {
    if (!newName.trim()) {
      toast.error("업체명을 입력해주세요");
      return;
    }
    createContractor.mutate(
      {
        name: newName.trim(),
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        contact_name: newContactName.trim() || null,
        notes: newNotes.trim() || null,
        specialty: newSpecialty
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          toast.success("업체가 추가되었습니다");
          setAddOpen(false);
          setNewName(""); setNewPhone(""); setNewEmail("");
          setNewContactName(""); setNewSpecialty(""); setNewNotes("");
        },
        onError: (err) => toast.error(`추가 실패: ${err.message}`),
      }
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlass
          size={16}
          weight="duotone"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="업체명 또는 전문분야 검색..."
          className="h-9 rounded-xl pl-9 text-[13px]"
        />
      </div>

      {/* Add button */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger
          render={
            <Button size="sm" className="w-full gap-1.5">
              <Plus size={14} weight="bold" />
              업체 추가
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 시공업체 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">업체명 *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="OO건설" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">담당자명</Label>
                <Input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="홍길동" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">전화번호</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="010-1234-5678" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">이메일</Label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="info@example.com" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">전문분야 (콤마로 구분)</Label>
              <Input value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)} placeholder="배관, 타일, 전기" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">메모</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="업체 관련 메모" className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
            <Button onClick={handleAddContractor} disabled={createContractor.isPending}>
              {createContractor.isPending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <HardHat
            size={40}
            weight="duotone"
            className="mx-auto mb-3 text-muted-foreground/40"
          />
          <p className="text-sm text-muted-foreground">
            {contractors?.length === 0
              ? "등록된 업체가 없습니다"
              : "조건에 맞는 업체가 없습니다"}
          </p>
        </motion.div>
      )}

      {/* Contractor cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((contractor, idx) => {
            const isExpanded = expandedId === contractor.id;
            return (
              <motion.div
                key={contractor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.04 }}
                layout
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : contractor.id)
                      }
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                        <HardHat
                          size={20}
                          weight="duotone"
                          className="text-primary"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">
                            {contractor.name}
                          </span>
                          {contractor.rating != null &&
                            contractor.rating > 0 && (
                              <StarRating rating={contractor.rating} />
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {contractor.specialty.map((spec) => (
                            <Badge
                              key={spec}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 text-muted-foreground">
                        {isExpanded ? (
                          <CaretUp weight="bold" className="size-4" />
                        ) : (
                          <CaretDown weight="bold" className="size-4" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <Separator />
                          <ContractorExpandedDetails
                            contractor={contractor}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Estimate comparison */}
      {!isLoading && (contractors ?? []).length > 0 && (
        <EstimateComparisonSection contractors={contractors ?? []} />
      )}
    </div>
  );
}

function ContractorExpandedDetails({
  contractor,
}: {
  contractor: Contractor;
}) {
  const { data: history, isLoading: historyLoading } = useContractorHistory(
    contractor.id
  );
  const { data: estimates, isLoading: estimatesLoading } = useEstimates(contractor.id);
  const createHistory = useCreateContractorHistory();
  const createEstimate = useCreateEstimate();
  const deleteContractor = useDeleteContractor();

  const [addHistoryOpen, setAddHistoryOpen] = useState(false);
  const [historyAction, setHistoryAction] = useState("");
  const [historyNotes, setHistoryNotes] = useState("");

  // 견적 추가 state
  const [addEstimateOpen, setAddEstimateOpen] = useState(false);
  const [estAmount, setEstAmount] = useState("");
  const [estDescription, setEstDescription] = useState("");
  const [estDate, setEstDate] = useState(new Date().toISOString().slice(0, 10));

  function handleAddHistory() {
    if (!historyAction.trim()) {
      toast.error("활동 내용을 입력해주세요");
      return;
    }
    createHistory.mutate(
      {
        contractor_id: contractor.id,
        action: historyAction.trim(),
        notes: historyNotes.trim() || null,
        date: new Date().toISOString().split("T")[0],
      },
      {
        onSuccess: () => {
          toast.success("이력이 추가되었습니다");
          setAddHistoryOpen(false);
          setHistoryAction("");
          setHistoryNotes("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleAddEstimate() {
    const numAmount = Number(estAmount);
    if (!numAmount) { toast.error("금액을 입력해주세요"); return; }
    createEstimate.mutate(
      {
        contractor_id: contractor.id,
        amount: numAmount,
        description: estDescription.trim() || null,
        date: estDate || null,
      },
      {
        onSuccess: () => {
          toast.success("견적이 추가되었습니다");
          setAddEstimateOpen(false);
          setEstAmount(""); setEstDescription(""); setEstDate(new Date().toISOString().slice(0, 10));
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleDelete() {
    deleteContractor.mutate(contractor.id, {
      onSuccess: () => toast.success("업체가 삭제되었습니다"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="p-3 space-y-3 bg-muted/10">
      {/* Contact info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {contractor.phone && (
          <div className="flex items-center gap-2">
            <Phone weight="duotone" className="size-4 text-muted-foreground" />
            <span>{contractor.phone}</span>
          </div>
        )}
        {contractor.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="truncate">{contractor.email}</span>
          </div>
        )}
      </div>

      {contractor.notes && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
          <ChatCircle weight="duotone" className="size-3.5 inline mr-1.5" />
          {contractor.notes}
        </p>
      )}

      {/* Contact history */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            연락 이력
          </span>
          <Button
            size="xs"
            variant="outline"
            className="gap-1"
            onClick={() => setAddHistoryOpen(!addHistoryOpen)}
          >
            <Plus size={10} weight="bold" />
            이력 추가
          </Button>
        </div>

        {addHistoryOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2 overflow-hidden"
          >
            <Input
              value={historyAction}
              onChange={(e) => setHistoryAction(e.target.value)}
              placeholder="활동 (예: 전화 상담, 현장 미팅)"
              className="text-xs"
            />
            <Input
              value={historyNotes}
              onChange={(e) => setHistoryNotes(e.target.value)}
              placeholder="메모 (선택)"
              className="text-xs"
            />
            <Button
              size="xs"
              onClick={handleAddHistory}
              disabled={createHistory.isPending}
            >
              {createHistory.isPending ? "추가 중..." : "추가"}
            </Button>
          </motion.div>
        )}

        {historyLoading && <Skeleton className="h-8 w-full" />}
        {!historyLoading && (history ?? []).length === 0 && (
          <p className="text-[11px] text-muted-foreground/60 py-2">
            연락 이력이 없습니다
          </p>
        )}
        {(history ?? []).map((h) => (
          <div
            key={h.id}
            className="flex items-start gap-2 rounded-lg bg-background p-2 text-xs"
          >
            <Notebook
              size={14}
              weight="duotone"
              className="text-muted-foreground mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{h.action}</span>
              {h.notes && (
                <p className="text-muted-foreground mt-0.5">{h.notes}</p>
              )}
            </div>
            {h.date && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {h.date}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 견적 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">견적</span>
          <Button size="xs" variant="outline" className="gap-1" onClick={() => setAddEstimateOpen(!addEstimateOpen)}>
            <Plus size={10} weight="bold" /> 견적 추가
          </Button>
        </div>

        {addEstimateOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2 overflow-hidden">
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={estAmount} onChange={(e) => setEstAmount(e.target.value)} placeholder="금액 (원)" className="text-xs" />
              <Input type="date" value={estDate} onChange={(e) => setEstDate(e.target.value)} className="text-xs" />
            </div>
            <Input value={estDescription} onChange={(e) => setEstDescription(e.target.value)} placeholder="설명 (예: 화장실 타일 시공)" className="text-xs" />
            <Button size="xs" onClick={handleAddEstimate} disabled={createEstimate.isPending}>
              {createEstimate.isPending ? "추가 중..." : "추가"}
            </Button>
          </motion.div>
        )}

        {estimatesLoading && <Skeleton className="h-8 w-full" />}
        {!estimatesLoading && (estimates ?? []).length === 0 && !addEstimateOpen && (
          <p className="text-[11px] text-muted-foreground/60 py-2">등록된 견적이 없습니다</p>
        )}
        {(estimates ?? []).map((est) => (
          <div key={est.id} className="flex items-center justify-between rounded-lg bg-background p-2 text-xs">
            <div className="min-w-0">
              <span className="font-medium">{est.amount != null ? formatKRW(est.amount) : "-"}</span>
              {est.description && <span className="text-muted-foreground ml-1.5">{est.description}</span>}
            </div>
            {est.date && <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{est.date}</span>}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {contractor.phone && (
          <Button
            size="xs"
            variant="outline"
            className="gap-1"
            onClick={() => {
              if (/Mobi|Android/i.test(navigator.userAgent)) {
                window.location.href = `tel:${contractor.phone}`;
              } else {
                navigator.clipboard.writeText(contractor.phone!);
                toast.success("전화번호가 복사되었습니다");
              }
            }}
          >
            <Phone size={12} weight="duotone" />
            전화
          </Button>
        )}
        <Button
          size="xs"
          variant="outline"
          className="gap-1 text-destructive hover:text-destructive ml-auto"
          onClick={handleDelete}
        >
          <Trash size={12} weight="duotone" />
          삭제
        </Button>
      </div>
    </div>
  );
}

function EstimateComparisonSection({
  contractors,
}: {
  contractors: Contractor[];
}) {
  const { data: estimates, isLoading } = useEstimates();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wrench size={16} weight="duotone" className="text-primary" />
            견적 비교표
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!estimates || estimates.length === 0) return null;

  // Group estimates by board_item_id/description
  const grouped = new Map<
    string,
    { label: string; byContractor: Map<string, number> }
  >();
  for (const est of estimates) {
    const key = est.board_item_id ?? est.description ?? "기타";
    const label = est.description ?? key;
    if (!grouped.has(key)) {
      grouped.set(key, { label, byContractor: new Map() });
    }
    if (est.amount != null) {
      grouped.get(key)!.byContractor.set(est.contractor_id, est.amount);
    }
  }

  if (grouped.size === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wrench size={16} weight="duotone" className="text-primary" />
            견적 비교표
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">항목</TableHead>
                  {contractors.map((c) => (
                    <TableHead key={c.id} className="text-right min-w-[90px]">
                      {c.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(grouped.entries()).map(([key, data]) => {
                  const prices = Array.from(data.byContractor.values());
                  const minPrice =
                    prices.length > 0 ? Math.min(...prices) : null;

                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium text-xs">
                        {data.label}
                      </TableCell>
                      {contractors.map((c) => {
                        const price = data.byContractor.get(c.id);
                        const isMin =
                          price != null && price === minPrice;
                        return (
                          <TableCell
                            key={c.id}
                            className={`text-right text-xs ${
                              isMin
                                ? "text-emerald-600 font-semibold"
                                : price != null
                                  ? ""
                                  : "text-muted-foreground"
                            }`}
                          >
                            {price != null ? formatKRW(price) : "-"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            * 초록색은 해당 항목의 최저 견적입니다
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Schedules
// ---------------------------------------------------------------------------

function SchedulesTab() {
  const { data: schedules, isLoading } = useSchedules();
  const createSchedule = useCreateSchedule();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDepartureLocation, setNewDepartureLocation] = useState("");
  const [newDepartureAddress, setNewDepartureAddress] = useState("");
  const [newDepartureTime, setNewDepartureTime] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // 출발지 검색
  const [depQuery, setDepQuery] = useState("");
  const [depResults, setDepResults] = useState<{ name: string; address: string }[]>([]);
  const [depSearching, setDepSearching] = useState(false);
  const depDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (depDebounceRef.current) clearTimeout(depDebounceRef.current);
    const q = depQuery.trim();
    if (q.length < 2) { setDepResults([]); return; }
    depDebounceRef.current = setTimeout(async () => {
      setDepSearching(true);
      try {
        const res = await fetch(`/api/places-search?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        setDepResults((data.items ?? []).map((r: { name: string; address: string }) => ({ name: r.name, address: r.address })));
      } catch { /* ignore */ }
      finally { setDepSearching(false); }
    }, 300);
    return () => { if (depDebounceRef.current) clearTimeout(depDebounceRef.current); };
  }, [depQuery]);

  function handleAddSchedule() {
    if (!newTitle.trim() || !newDate) {
      toast.error("제목과 날짜를 입력해주세요");
      return;
    }
    // 출발 정보를 notes에 구조화해서 저장
    const depName = newDepartureLocation.trim();
    const depAddr = newDepartureAddress.trim();
    const depTime = newDepartureTime.trim();
    const departureMeta = (depName || depTime)
      ? `[출발] ${depName || "미정"}${depAddr ? ` (${depAddr})` : ""} ${depTime}\n`
      : "";
    const finalNotes = (departureMeta + (newNotes.trim() || "")).trim() || null;

    createSchedule.mutate(
      {
        title: newTitle.trim(),
        date: newDate,
        notes: finalNotes,
      },
      {
        onSuccess: () => {
          toast.success("스케줄이 추가되었습니다");
          setAddOpen(false);
          setNewTitle(""); setNewDate("");
          setNewDepartureLocation(""); setNewDepartureAddress(""); setNewDepartureTime("");
          setNewNotes(""); setDepQuery(""); setDepResults([]);
        },
        onError: (err) => toast.error(`추가 실패: ${err.message}`),
      }
    );
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger
          render={
            <Button size="sm" className="w-full gap-1.5">
              <Plus size={14} weight="bold" />
              스케줄 추가
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 스케줄 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">제목 *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="쇼룸 투어" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">날짜 *</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="mt-1" />
            </div>
            {/* 출발지 (선택) */}
            <fieldset className="rounded-lg border p-3 space-y-2">
              <legend className="text-xs font-medium text-muted-foreground px-1">출발지 (선택)</legend>
              <div className="relative">
                <MagnifyingGlass size={14} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={depQuery}
                  onChange={(e) => setDepQuery(e.target.value)}
                  placeholder="출발지 검색 (예: 포천 한옥)"
                  className="pl-8"
                />
                {depSearching && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">검색중...</span>}
              </div>
              {depResults.length > 0 && (
                <div className="rounded-lg border divide-y max-h-32 overflow-y-auto">
                  {depResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setNewDepartureLocation(r.name);
                        setNewDepartureAddress(r.address);
                        setDepResults([]);
                        setDepQuery("");
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors"
                    >
                      <p className="text-xs font-medium truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.address}</p>
                    </button>
                  ))}
                </div>
              )}
              {newDepartureLocation && (
                <div className="flex items-center justify-between bg-muted/50 rounded-md px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{newDepartureLocation}</p>
                    {newDepartureAddress && <p className="text-[10px] text-muted-foreground truncate">{newDepartureAddress}</p>}
                  </div>
                  <button onClick={() => { setNewDepartureLocation(""); setNewDepartureAddress(""); }} className="shrink-0 text-muted-foreground hover:text-foreground ml-2">
                    <X size={12} />
                  </button>
                </div>
              )}
              <div>
                <Label className="text-[11px]">출발 시간</Label>
                <Input type="time" value={newDepartureTime} onChange={(e) => setNewDepartureTime(e.target.value)} className="mt-0.5" />
              </div>
            </fieldset>
            <div>
              <Label className="text-xs">메모</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="추가 요청사항 (선택)" rows={2} className="mt-1 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddSchedule}
              disabled={createSchedule.isPending}
              className="w-full"
            >
              {createSchedule.isPending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (schedules ?? []).length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <CalendarBlank
            size={40}
            weight="duotone"
            className="mx-auto mb-3 text-muted-foreground/40"
          />
          <p className="text-sm text-muted-foreground">
            등록된 스케줄이 없습니다
          </p>
        </motion.div>
      )}

      {/* Schedule cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {(schedules ?? []).map((schedule, idx) => {
            const isExpanded = expandedId === schedule.id;
            return (
              <motion.div
                key={schedule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.04 }}
                layout
              >
                <Card size="sm" className="overflow-hidden">
                  <CardContent className="p-0">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : schedule.id)
                      }
                      className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold">
                            {schedule.title}
                          </h3>
                          <p className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1">
                            <CalendarBlank size={11} weight="duotone" />
                            {schedule.date}
                          </p>
                        </div>
                        <div className="shrink-0 text-muted-foreground">
                          {isExpanded ? (
                            <CaretUp weight="bold" className="size-4" />
                          ) : (
                            <CaretDown weight="bold" className="size-4" />
                          )}
                        </div>
                      </div>
                      {(() => {
                        const dep = parseDepartureFromNotes(schedule.notes);
                        const cleanNotes = schedule.notes?.replace(/\[출발\].*\n?/, "").trim();
                        return (
                          <>
                            {(dep.departureLocation || dep.departureTime) && (
                              <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                                <NavigationArrow size={10} weight="duotone" className="text-primary" />
                                {dep.departureLocation || "출발지 미정"}
                                {dep.departureTime && <span className="font-medium">{dep.departureTime}</span>}
                              </p>
                            )}
                            {cleanNotes && (
                              <p className="mt-1 text-[11px] text-muted-foreground">{cleanNotes}</p>
                            )}
                          </>
                        );
                      })()}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <Separator />
                          <ScheduleStopsTimeline schedule={schedule} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function parseDepartureFromNotes(notes: string | null): { departureLocation?: string; departureAddress?: string; departureTime?: string } {
  if (!notes) return {};
  const match = notes.match(/\[출발\]\s*(.+?)(?:\s*\(([^)]+)\))?\s*(\d{1,2}:\d{2})?\s*(?:\n|$)/);
  if (!match) return {};
  const name = match[1]?.trim();
  return {
    departureLocation: name === "미정" ? undefined : name,
    departureAddress: match[2]?.trim() || undefined,
    departureTime: match[3] || undefined,
  };
}

function ScheduleStopsTimeline({ schedule }: { schedule: Schedule }) {
  const { data: stops, isLoading } = useScheduleStops(schedule.id);
  const { data: places } = usePlaces();
  const createStop = useCreateScheduleStop();
  const updateStop = useUpdateScheduleStop();
  const deleteStop = useDeleteScheduleStop();

  const [addStopOpen, setAddStopOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  // LLM 추천 미리보기 state
  interface SuggestedStop {
    place_id: string;
    placeName: string;
    placeAddress: string | null;
    arrival: string;
    departure: string;
    notes: string;
  }
  const [suggestedStops, setSuggestedStops] = useState<SuggestedStop[] | null>(null);
  const [suggestSummary, setSuggestSummary] = useState("");
  const [applying, setApplying] = useState(false);

  // 장소 수동 추가
  function handleAddStop() {
    if (!selectedPlaceId) { toast.error("장소를 선택해주세요"); return; }
    const nextOrder = (stops?.length ?? 0) + 1;
    createStop.mutate(
      { schedule_id: schedule.id, place_id: selectedPlaceId, stop_order: nextOrder },
      {
        onSuccess: () => { setSelectedPlaceId(""); setAddStopOpen(false); toast.success("경유지가 추가되었습니다"); },
        onError: () => toast.error("추가 실패"),
      }
    );
  }

  // 완료 토글
  function handleToggleComplete(stop: { id: string; is_completed: boolean }) {
    updateStop.mutate({
      id: stop.id,
      schedule_id: schedule.id,
      is_completed: !stop.is_completed,
    });
  }

  // 삭제
  function handleDeleteStop(stopId: string) {
    deleteStop.mutate({ id: stopId, schedule_id: schedule.id });
  }

  // LLM 자동 추천 — 미리보기만
  async function handleAutoSuggest() {
    if (!places || places.length === 0) { toast.error("등록된 장소가 없습니다"); return; }

    const targetPlaces = stops && stops.length > 0
      ? stops.filter((s) => s.place).map((s) => ({
          id: s.place!.id, name: s.place!.name,
          address: s.place!.address, business_hours: s.place!.business_hours, category: s.place!.category,
        }))
      : places.slice(0, 10).map((p) => ({
          id: p.id, name: p.name, address: p.address, business_hours: p.business_hours, category: p.category,
        }));

    if (targetPlaces.length === 0) { toast.error("방문할 장소를 먼저 추가해주세요"); return; }

    setSuggesting(true);
    setSuggestedStops(null);
    try {
      const res = await fetch("/api/schedule-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          places: targetPlaces,
          date: schedule.date,
          notes: schedule.notes?.replace(/\[출발\].*\n?/, "").trim() || undefined,
          ...parseDepartureFromNotes(schedule.notes),
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        console.error("Schedule suggest error:", data);
        toast.error(data.error || "자동 추천 실패");
        return;
      }
      if (!data.schedule || data.schedule.length === 0) { toast.error("추천 결과가 없습니다"); return; }

      // 미리보기 state에 저장 (DB 저장 안 함)
      const preview: SuggestedStop[] = data.schedule.map((item: { place_id: string; arrival: string; departure: string; notes: string }) => {
        const place = targetPlaces.find((p) => p.id === item.place_id);
        return {
          place_id: item.place_id,
          placeName: place?.name ?? "알 수 없는 장소",
          placeAddress: place?.address ?? null,
          arrival: item.arrival || "",
          departure: item.departure || "",
          notes: item.notes || "",
        };
      });
      setSuggestedStops(preview);
      setSuggestSummary(data.summary || "");
    } catch {
      toast.error("자동 추천 실패");
    } finally {
      setSuggesting(false);
    }
  }

  // 추천 결과에서 항목 수정
  function updateSuggested(idx: number, field: keyof SuggestedStop, value: string) {
    setSuggestedStops((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  // 추천 결과에서 항목 삭제
  function removeSuggested(idx: number) {
    setSuggestedStops((prev) => prev ? prev.filter((_, i) => i !== idx) : prev);
  }

  // 추천 결과 적용 (DB 저장)
  async function handleApplySuggestion() {
    if (!suggestedStops || suggestedStops.length === 0) return;
    setApplying(true);
    try {
      // 기존 정류장 삭제
      if (stops) {
        for (const s of stops) {
          await deleteStop.mutateAsync({ id: s.id, schedule_id: schedule.id });
        }
      }
      // 추천 순서대로 생성
      for (let i = 0; i < suggestedStops.length; i++) {
        const item = suggestedStops[i];
        await createStop.mutateAsync({
          schedule_id: schedule.id,
          place_id: item.place_id,
          stop_order: i + 1,
          planned_arrival: item.arrival || null,
          planned_departure: item.departure || null,
          notes: item.notes || null,
        });
      }
      toast.success("스케줄이 적용되었습니다");
      setSuggestedStops(null);
      setSuggestSummary("");
    } catch {
      toast.error("적용 실패");
    } finally {
      setApplying(false);
    }
  }

  // 사용 가능한 장소 (이미 추가된 건 제외)
  const addedPlaceIds = new Set((stops ?? []).map((s) => s.place_id).filter(Boolean));
  const availablePlaces = (places ?? []).filter((p) => !addedPlaceIds.has(p.id));

  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Button size="xs" variant="outline" className="gap-1" onClick={() => setAddStopOpen(!addStopOpen)}>
          <Plus size={10} weight="bold" /> 장소 추가
        </Button>
        <Button
          size="xs"
          variant="outline"
          className="gap-1"
          onClick={handleAutoSuggest}
          disabled={suggesting}
        >
          <Path size={10} weight="duotone" />
          {suggesting ? "추천 중..." : "자동 추천"}
        </Button>
      </div>

      {/* 장소 추가 — 인라인 리스트 */}
      {addStopOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
          {availablePlaces.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-3">추가할 장소가 없습니다</p>
          ) : (
            <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
              {availablePlaces.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPlaceId(p.id);
                    const nextOrder = (stops?.length ?? 0) + 1;
                    createStop.mutate(
                      { schedule_id: schedule.id, place_id: p.id, stop_order: nextOrder },
                      {
                        onSuccess: () => toast.success(`${p.name} 추가됨`),
                        onError: () => toast.error("추가 실패"),
                      }
                    );
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                >
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  {p.address && <p className="text-[10px] text-muted-foreground truncate">{p.address}</p>}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* 경유지 없을 때 */}
      {(!stops || stops.length === 0) && !addStopOpen && (
        <p className="text-[11px] text-muted-foreground text-center py-4">
          경유지를 추가하거나 자동 추천을 사용해보세요
        </p>
      )}

      {/* 타임라인 */}
      {stops && stops.length > 0 && (
        <div className="space-y-0">
          {stops.map((stop, idx) => (
            <div key={stop.id} className="flex gap-3">
              <div className="flex w-6 shrink-0 flex-col items-center">
                <button
                  className="mt-1"
                  onClick={() => handleToggleComplete(stop)}
                  title={stop.is_completed ? "완료 취소" : "완료 처리"}
                >
                  {stop.is_completed ? (
                    <CheckCircle size={18} weight="duotone" className="text-emerald-500" />
                  ) : (
                    <Circle size={18} weight="duotone" className="text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>
                {idx < stops.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
              </div>
              <div className={`flex-1 ${idx < stops.length - 1 ? "pb-3" : ""}`}>
                <div className={`rounded-lg bg-background p-2.5 ring-1 ring-border ${stop.is_completed ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold truncate">
                        {stop.place?.name ?? `경유지 ${stop.stop_order}`}
                      </h4>
                      {stop.place?.address && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{stop.place.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {stop.planned_arrival && (
                        <Badge variant="secondary" className="text-[9px]">{stop.planned_arrival}</Badge>
                      )}
                      {stop.planned_departure && (
                        <span className="text-[9px] text-muted-foreground">~ {stop.planned_departure}</span>
                      )}
                      <button
                        onClick={() => handleDeleteStop(stop.id)}
                        className="rounded p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                  {stop.notes && (
                    <p className="mt-1 text-[10px] text-muted-foreground">{stop.notes}</p>
                  )}
                  {stop.place?.business_hours && (
                    <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} weight="duotone" /> {stop.place.business_hours}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LLM 추천 미리보기 */}
      {suggestedStops && suggestedStops.length > 0 && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary">AI 추천 스케줄</p>
              {suggestSummary && <p className="text-[11px] text-muted-foreground mt-0.5">{suggestSummary}</p>}
            </div>
            <button onClick={() => { setSuggestedStops(null); setSuggestSummary(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} weight="bold" />
            </button>
          </div>

          <div className="space-y-2">
            {suggestedStops.map((item, idx) => (
              <div key={idx} className="rounded-lg bg-background p-2.5 ring-1 ring-border space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold">{idx + 1}. {item.placeName}</span>
                    {item.placeAddress && <p className="text-[10px] text-muted-foreground truncate">{item.placeAddress}</p>}
                  </div>
                  <button onClick={() => removeSuggested(idx)} className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors">
                    <Trash size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-muted-foreground">도착</label>
                    <Input value={item.arrival} onChange={(e) => updateSuggested(idx, "arrival", e.target.value)} className="h-7 text-xs mt-0.5" placeholder="09:30" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">출발</label>
                    <Input value={item.departure} onChange={(e) => updateSuggested(idx, "departure", e.target.value)} className="h-7 text-xs mt-0.5" placeholder="10:30" />
                  </div>
                </div>
                <Input value={item.notes} onChange={(e) => updateSuggested(idx, "notes", e.target.value)} className="h-7 text-[11px]" placeholder="메모" />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleApplySuggestion} disabled={applying} className="flex-1">
              {applying ? "적용 중..." : "이 스케줄 적용"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setSuggestedStops(null); setSuggestSummary(""); }}>
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PlacesPage() {
  const [activeTab, setActiveTab] = useState("places");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <MapPin size={18} weight="duotone" className="text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold">장소 / 업자</h1>
              <p className="text-[10px] text-muted-foreground">
                장소, 시공업체, 스케줄 관리
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs + content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="places" className="flex-1 gap-1.5">
                <MapPin size={14} weight="duotone" />
                장소
              </TabsTrigger>
              <TabsTrigger value="contractors" className="flex-1 gap-1.5">
                <HardHat size={14} weight="duotone" />
                시공업자
              </TabsTrigger>
              <TabsTrigger value="schedules" className="flex-1 gap-1.5">
                <Path size={14} weight="duotone" />
                스케줄
              </TabsTrigger>
            </TabsList>

            <TabsContent value="places">
              <PlacesTab />
            </TabsContent>

            <TabsContent value="contractors">
              <ContractorsTab />
            </TabsContent>

            <TabsContent value="schedules">
              <SchedulesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
