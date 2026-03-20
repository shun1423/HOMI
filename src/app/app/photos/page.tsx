"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  X,
  ArrowsLeftRight,
  Images,
  CalendarBlank,
  MapPin,
  Tag,
  Trash,
  Plus,
  CloudArrowUp,
  SpinnerGap,
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
import { Input } from "@/components/ui/input";
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
import {
  useProjectPhotos,
  useCreateProjectPhoto,
  useDeleteProjectPhoto,
  useSpaces,
  useBoardItems,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import type { Photo, PhotoStage, Space } from "@/types/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGE_OPTIONS: { value: PhotoStage; label: string }[] = [
  { value: "before", label: "시공전" },
  { value: "during", label: "시공중" },
  { value: "after", label: "시공후" },
];

const STAGE_LABEL: Record<PhotoStage, string> = {
  before: "시공전", during: "시공중", after: "시공후",
};

const STAGE_BADGE_VARIANT: Record<PhotoStage, "default" | "secondary" | "outline"> = {
  before: "outline", during: "secondary", after: "default",
};

const STAGE_BG: Record<PhotoStage, string> = {
  before: "bg-slate-100 dark:bg-slate-800",
  during: "bg-amber-50 dark:bg-amber-950/30",
  after: "bg-emerald-50 dark:bg-emerald-950/30",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function isRealUrl(url: string) {
  return url && !url.startsWith("placeholder") && !url.endsWith("placeholder-photo.jpg");
}

// ---------------------------------------------------------------------------
// Photo Upload Area
// ---------------------------------------------------------------------------

function PhotoUploadArea({
  onUploaded,
  uploading,
  setUploading,
}: {
  onUploaded: (url: string) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("이미지 파일만 가능합니다"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("10MB 이하만 가능합니다"); return; }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `project-photos/${Date.now()}-${randomId()}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, file);
      if (error) { toast.error("업로드 실패: " + error.message); return; }
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch {
      toast.error("업로드 오류");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed py-6 transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {uploading ? (
        <>
          <SpinnerGap size={24} weight="bold" className="animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">업로드 중...</p>
        </>
      ) : (
        <>
          <CloudArrowUp size={24} weight="duotone" className="text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">클릭 또는 드래그하여 사진 업로드</p>
          <p className="text-[10px] text-muted-foreground/60">JPG, PNG (최대 10MB)</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Photo Form Dialog (add + edit)
// ---------------------------------------------------------------------------

function PhotoFormDialog({
  open,
  onOpenChange,
  spaces,
  photo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  spaces: Space[];
  photo?: Photo;
}) {
  const createPhoto = useCreateProjectPhoto();
  const { data: boardItems } = useBoardItems();
  const isEditing = !!photo;

  const [fileUrl, setFileUrl] = useState(photo && isRealUrl(photo.file_url) ? photo.file_url : "");
  const [spaceId, setSpaceId] = useState(photo?.space_id ?? "");
  const [boardItemId, setBoardItemId] = useState(photo?.board_item_id ?? "");
  const [stage, setStage] = useState<string>(photo?.stage ?? "");
  const [description, setDescription] = useState(photo?.description ?? "");
  const [takenAt, setTakenAt] = useState(photo?.taken_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);

  // Filter board items by selected space
  const filteredBoardItems = useMemo(() => {
    if (!boardItems || !spaceId) return [];
    return boardItems.filter((bi) => bi.space_id === spaceId);
  }, [boardItems, spaceId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileUrl) { toast.error("사진을 업로드해주세요"); return; }

    createPhoto.mutate(
      {
        file_url: fileUrl,
        space_id: spaceId || null,
        board_item_id: boardItemId || null,
        stage: (stage as PhotoStage) || null,
        description: description.trim() || null,
        taken_at: takenAt || null,
      },
      {
        onSuccess: () => { toast.success("사진이 추가되었습니다"); onOpenChange(false); },
        onError: () => toast.error("추가 실패"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "사진 정보 수정" : "사진 추가"}</DialogTitle>
          <DialogDescription>{isEditing ? "사진 정보를 수정합니다" : "사진을 업로드하고 정보를 입력합니다"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Upload / Preview */}
          {fileUrl ? (
            <div className="relative rounded-lg overflow-hidden">
              <img src={fileUrl} alt="미리보기" className="w-full aspect-[4/3] object-cover" />
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setFileUrl("")}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          ) : (
            <PhotoUploadArea onUploaded={setFileUrl} uploading={uploading} setUploading={setUploading} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>공간</Label>
              <Select value={spaceId} onValueChange={(v) => { setSpaceId(v === "__none__" ? "" : v); setBoardItemId(""); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">미지정</SelectItem>
                  {spaces.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>단계</Label>
              <Select value={stage} onValueChange={(v) => setStage(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">미지정</SelectItem>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Board item selector */}
          {spaceId && filteredBoardItems.length > 0 && (
            <div className="space-y-1.5">
              <Label>관련 항목</Label>
              <Select value={boardItemId} onValueChange={(v) => setBoardItemId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">없음</SelectItem>
                  {filteredBoardItems.map((bi) => (
                    <SelectItem key={bi.id} value={bi.id}>{bi.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="photo-desc">설명</Label>
              <Input id="photo-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="사진 설명" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-date">촬영일</Label>
              <Input id="photo-date" type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={createPhoto.isPending || !fileUrl}>
              {createPhoto.isPending ? "저장 중..." : isEditing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Photo Viewer (fullscreen)
// ---------------------------------------------------------------------------

function PhotoViewer({
  photo,
  spaceName,
  onClose,
  onDelete,
  onEdit,
}: {
  photo: Photo;
  spaceName: string | null;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const stage = photo.stage;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        {/* Image */}
        <div className="bg-black">
          {isRealUrl(photo.file_url) ? (
            <img src={photo.file_url} alt={photo.description ?? ""} className="w-full max-h-[60vh] object-contain" />
          ) : (
            <div className="w-full aspect-[4/3] flex items-center justify-center">
              <Camera weight="duotone" className="size-16 text-white/20" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stage && <Badge variant={STAGE_BADGE_VARIANT[stage]}>{STAGE_LABEL[stage]}</Badge>}
              {spaceName && <span className="text-xs text-muted-foreground">{spaceName}</span>}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-xs" onClick={onEdit}>
                <PencilSimple weight="duotone" className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => { if (confirm("삭제하시겠습니까?")) onDelete(); }}>
                <Trash weight="duotone" className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
          {photo.description && <p className="text-sm">{photo.description}</p>}
          {(photo.taken_at || photo.created_at) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarBlank size={12} weight="duotone" />
              {(photo.taken_at ?? photo.created_at).slice(0, 10)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Photo Card
// ---------------------------------------------------------------------------

function PhotoCard({
  photo,
  spaceName,
  index,
  onClick,
  onDelete,
}: {
  photo: Photo;
  spaceName: string | null;
  index: number;
  onClick: () => void;
  onDelete: () => void;
}) {
  const stage = photo.stage;
  const stageLabel = stage ? STAGE_LABEL[stage] : null;
  const stageBadgeVariant = stage ? STAGE_BADGE_VARIANT[stage] : "outline" as const;
  const stageBg = stage ? STAGE_BG[stage] : "bg-muted";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      layout
      className="group cursor-pointer"
      onClick={onClick}
    >
      <Card size="sm" className="overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all">
        {/* Photo */}
        <div className={`aspect-[4/3] relative overflow-hidden ${!isRealUrl(photo.file_url) ? stageBg + " flex items-center justify-center" : ""}`}>
          {isRealUrl(photo.file_url) ? (
            <img src={photo.file_url} alt={photo.description ?? ""} className="w-full h-full object-cover" />
          ) : (
            <Camera weight="duotone" className="size-10 text-foreground/20" />
          )}
          {stageLabel && (
            <div className="absolute top-2 left-2">
              <Badge variant={stageBadgeVariant} className="text-[10px]">{stageLabel}</Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/50"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash weight="duotone" className="size-3 text-destructive" />
          </Button>
        </div>
        <CardContent className="py-2.5 space-y-1">
          {spaceName && (
            <div className="flex items-center gap-1.5">
              <MapPin weight="duotone" className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium">{spaceName}</span>
            </div>
          )}
          {photo.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{photo.description}</p>}
          {(photo.taken_at || photo.created_at) && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CalendarBlank weight="duotone" className="size-3" />
              {(photo.taken_at ?? photo.created_at).slice(0, 10)}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Compare View
// ---------------------------------------------------------------------------

function CompareView({ photos, spaces, onClose }: { photos: Photo[]; spaces: Space[]; onClose: () => void }) {
  const spaceWithBoth = useMemo(() => {
    const bySpace: Record<string, { before?: Photo; after?: Photo }> = {};
    for (const p of photos) {
      if (!p.space_id || !p.stage) continue;
      if (!bySpace[p.space_id]) bySpace[p.space_id] = {};
      if (p.stage === "before") bySpace[p.space_id].before = p;
      if (p.stage === "after") bySpace[p.space_id].after = p;
    }
    return Object.entries(bySpace)
      .filter(([, v]) => v.before && v.after)
      .map(([spaceId, v]) => ({ space: spaces.find((s) => s.id === spaceId), before: v.before!, after: v.after! }));
  }, [photos, spaces]);

  if (spaceWithBoth.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><ArrowsLeftRight weight="duotone" className="size-5" /> 비포/애프터</CardTitle>
            <Button variant="ghost" size="icon-sm" onClick={onClose}><X weight="bold" className="size-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground">같은 공간에 시공전 + 시공후 사진이 모두 있어야 비교할 수 있습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {spaceWithBoth.map(({ space, before, after }) => (
        <Card key={space?.id ?? "u"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{space?.name ?? "알 수 없는 공간"} — 비포/애프터</CardTitle>
              <Button variant="ghost" size="icon-sm" onClick={onClose}><X weight="bold" className="size-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[{ label: "시공전", photo: before, bg: STAGE_BG.before }, { label: "시공후", photo: after, bg: STAGE_BG.after }].map(({ label, photo, bg }) => (
                <div key={label} className="space-y-2">
                  <Badge variant={label === "시공전" ? "outline" : "default"}>{label}</Badge>
                  <div className={`aspect-[4/3] rounded-lg overflow-hidden ${!isRealUrl(photo.file_url) ? bg + " flex items-center justify-center" : ""}`}>
                    {isRealUrl(photo.file_url) ? (
                      <img src={photo.file_url} alt={photo.description ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      <Camera weight="duotone" className="size-12 text-foreground/20" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{photo.description ?? ""}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function PhotosSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-6 w-28" /><Skeleton className="h-4 w-48 mt-1" /></div>
        <div className="flex gap-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-20" /></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PhotosPage() {
  const { data: photos = [], isLoading: photosLoading } = useProjectPhotos();
  const { data: spaces = [], isLoading: spacesLoading } = useSpaces();
  const deletePhoto = useDeleteProjectPhoto();

  const [spaceFilter, setSpaceFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showCompare, setShowCompare] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  const isLoading = photosLoading || spacesLoading;

  const spaceMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of spaces) map[s.id] = s.name;
    return map;
  }, [spaces]);

  const filtered = useMemo(() => {
    return photos.filter((p) => {
      if (spaceFilter !== "all" && p.space_id !== spaceFilter) return false;
      if (stageFilter !== "all" && p.stage !== stageFilter) return false;
      return true;
    });
  }, [photos, spaceFilter, stageFilter]);

  const stageCounts = useMemo(() => {
    const c: Record<string, number> = { before: 0, during: 0, after: 0 };
    for (const p of photos) { if (p.stage && c[p.stage] !== undefined) c[p.stage]++; }
    return c;
  }, [photos]);

  function handleDelete(id: string) {
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;

    // Delete from storage too
    const photo = photos.find((p) => p.id === id);
    if (photo && isRealUrl(photo.file_url)) {
      const path = photo.file_url.split("/storage/v1/object/public/photos/")[1];
      if (path) {
        const supabase = createClient();
        supabase.storage.from("photos").remove([path]);
      }
    }

    deletePhoto.mutate(id, {
      onSuccess: () => { toast.success("사진이 삭제되었습니다"); setViewerPhoto(null); },
      onError: () => toast.error("삭제 실패"),
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6"><PhotosSkeleton /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">시공 사진</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {photos.length > 0
                ? `시공전 ${stageCounts.before} · 시공중 ${stageCounts.during} · 시공후 ${stageCounts.after} · 총 ${photos.length}장`
                : "공간별 시공 전/중/후 사진 기록"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant={showCompare ? "default" : "outline"} size="default" onClick={() => setShowCompare(!showCompare)}>
              <ArrowsLeftRight weight="duotone" className="size-4" />
              <span className="hidden sm:inline">비교</span>
            </Button>
            <Button size="default" onClick={() => { setEditingPhoto(null); setShowForm(true); }}>
              <Plus weight="bold" className="size-4" />
              <span className="hidden sm:inline">추가</span>
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin weight="duotone" className="size-4 text-muted-foreground shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              <Button variant={spaceFilter === "all" ? "default" : "outline"} size="xs" onClick={() => setSpaceFilter("all")}>전체</Button>
              {spaces.map((s) => (
                <Button key={s.id} variant={spaceFilter === s.id ? "default" : "outline"} size="xs" onClick={() => setSpaceFilter(s.id)}>{s.name}</Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tag weight="duotone" className="size-4 text-muted-foreground shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              <Button variant={stageFilter === "all" ? "default" : "outline"} size="xs" onClick={() => setStageFilter("all")}>전체</Button>
              {STAGE_OPTIONS.map((s) => (
                <Button key={s.value} variant={stageFilter === s.value ? "default" : "outline"} size="xs" onClick={() => setStageFilter(s.value)}>{s.label}</Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Compare */}
        <AnimatePresence>
          {showCompare && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <CompareView photos={photos} spaces={spaces} onClose={() => setShowCompare(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                spaceName={photo.space_id ? spaceMap[photo.space_id] ?? null : null}
                index={index}
                onClick={() => setViewerPhoto(photo)}
                onDelete={() => handleDelete(photo.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Images weight="duotone" className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {photos.length === 0 ? "아직 사진이 없습니다" : "필터 조건에 맞는 사진이 없습니다"}
            </p>
          </motion.div>
        )}

        {/* Form Dialog */}
        {showForm && <PhotoFormDialog open={showForm} onOpenChange={setShowForm} spaces={spaces} photo={editingPhoto ?? undefined} />}

        {/* Viewer */}
        {viewerPhoto && (
          <PhotoViewer
            photo={viewerPhoto}
            spaceName={viewerPhoto.space_id ? spaceMap[viewerPhoto.space_id] ?? null : null}
            onClose={() => setViewerPhoto(null)}
            onDelete={() => handleDelete(viewerPhoto.id)}
            onEdit={() => { setEditingPhoto(viewerPhoto); setViewerPhoto(null); setShowForm(true); }}
          />
        )}
      </div>
    </div>
  );
}
