"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  MagnifyingGlass,
  Plus,
  InstagramLogo,
  PinterestLogo,
  Browser,
  Tag,
  FunnelSimple,
  Images,
  Trash,
  Upload,
  GlobeSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMoodImages,
  useCreateMoodImage,
  useUpdateMoodImage,
  useDeleteMoodImage,
  useSpaces,
} from "@/lib/queries";
import type { MoodImage, MoodImageSourceType, Space } from "@/types/database";

// --- Helpers ---

const SOURCE_TYPE_LABELS: Record<MoodImageSourceType, string> = {
  upload: "업로드",
  instagram: "인스타",
  pinterest: "핀터레스트",
  blog: "블로그",
  other: "기타",
};

function SourceIcon({
  sourceType,
}: {
  sourceType: MoodImageSourceType;
}) {
  switch (sourceType) {
    case "instagram":
      return <InstagramLogo weight="duotone" className="size-3.5" />;
    case "pinterest":
      return <PinterestLogo weight="duotone" className="size-3.5" />;
    case "blog":
      return <Browser weight="duotone" className="size-3.5" />;
    case "upload":
      return <Upload weight="duotone" className="size-3.5" />;
    default:
      return <GlobeSimple weight="duotone" className="size-3.5" />;
  }
}

// Deterministic gradient from image id
const GRADIENTS = [
  "bg-gradient-to-br from-stone-300 to-stone-500",
  "bg-gradient-to-br from-amber-200 to-orange-300",
  "bg-gradient-to-br from-gray-300 to-gray-500",
  "bg-gradient-to-br from-yellow-100 to-amber-300",
  "bg-gradient-to-br from-orange-200 to-amber-400",
  "bg-gradient-to-br from-blue-200 to-indigo-300",
  "bg-gradient-to-br from-rose-200 to-pink-300",
  "bg-gradient-to-br from-emerald-200 to-teal-300",
  "bg-gradient-to-br from-sky-100 to-blue-200",
  "bg-gradient-to-br from-stone-400 to-stone-600",
  "bg-gradient-to-br from-violet-200 to-purple-300",
  "bg-gradient-to-br from-lime-200 to-green-300",
];

const HEIGHTS = ["h-40", "h-44", "h-48", "h-52", "h-56"];

function getGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function getHeight(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 37 + id.charCodeAt(i)) | 0;
  }
  return HEIGHTS[Math.abs(hash) % HEIGHTS.length];
}

function getSpaceColor(spaces: Space[], spaceId: string | null): string {
  if (!spaceId) return "bg-muted-foreground";
  const space = spaces.find((s) => s.id === spaceId);
  if (space?.color) return space.color;
  return "bg-muted-foreground";
}

function getSpaceName(spaces: Space[], spaceId: string | null): string {
  if (!spaceId) return "미지정";
  return spaces.find((s) => s.id === spaceId)?.name ?? "미지정";
}

// --- Components ---

function MoodImageCard({
  item,
  index,
  spaces,
  onToggleLike,
  onDelete,
}: {
  item: MoodImage;
  index: number;
  spaces: Space[];
  onToggleLike: () => void;
  onDelete: () => void;
}) {
  const gradient = getGradient(item.id);
  const height = getHeight(item.id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="break-inside-avoid"
    >
      <Card className="overflow-hidden group">
        {/* Image placeholder */}
        <div
          className={`${gradient} ${height} relative flex items-center justify-center`}
        >
          <Images weight="duotone" className="size-10 text-white/30" />

          {/* Like button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            className="absolute top-2 right-2 size-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors"
          >
            <Heart
              weight={item.is_liked ? "fill" : "regular"}
              className={`size-4 ${item.is_liked ? "text-red-400" : "text-white"}`}
            />
          </button>

          {/* Delete button (shown on hover) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-2 left-10 size-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash weight="bold" className="size-3.5 text-white" />
          </button>

          {/* Space tag */}
          <div className="absolute bottom-2 left-2">
            <Badge
              className={`text-[10px] text-white border-0 ${getSpaceColor(spaces, item.space_id)}`}
            >
              {getSpaceName(spaces, item.space_id)}
            </Badge>
          </div>

          {/* Source label */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/20 backdrop-blur-sm text-white rounded-full px-2 py-0.5 text-[10px]">
            <SourceIcon sourceType={item.source_type} />
            {SOURCE_TYPE_LABELS[item.source_type]}
          </div>
        </div>

        <CardContent className="py-3 space-y-2">
          {item.notes && (
            <p className="text-[11px] text-muted-foreground line-clamp-2">
              {item.notes}
            </p>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag weight="duotone" className="size-3 text-muted-foreground" />
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AddMoodImageDialog({
  open,
  onOpenChange,
  spaces,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaces: Space[];
}) {
  const createMoodImage = useCreateMoodImage();
  const [spaceId, setSpaceId] = useState<string>("");
  const [sourceType, setSourceType] = useState<MoodImageSourceType>("upload");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    createMoodImage.mutate(
      {
        image_url: "", // placeholder - no real upload yet
        space_id: spaceId || null,
        source_type: sourceType,
        source_url: sourceUrl.trim() || null,
        notes: notes.trim() || null,
        tags,
      },
      {
        onSuccess: () => {
          toast.success("이미지가 추가되었습니다");
          onOpenChange(false);
          setSpaceId("");
          setSourceType("upload");
          setNotes("");
          setTagsInput("");
          setSourceUrl("");
        },
        onError: () => {
          toast.error("이미지 추가에 실패했습니다");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>이미지 추가</DialogTitle>
          <DialogDescription>
            무드보드에 영감 이미지를 추가합니다
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>공간</Label>
            <Select value={spaceId} onValueChange={(v) => setSpaceId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="공간 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>출처 유형</Label>
            <Select
              value={sourceType}
              onValueChange={(v) => setSourceType((v ?? "upload") as MoodImageSourceType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upload">업로드</SelectItem>
                <SelectItem value="instagram">인스타그램</SelectItem>
                <SelectItem value="pinterest">핀터레스트</SelectItem>
                <SelectItem value="blog">블로그</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mood-source-url">출처 URL</Label>
            <Input
              id="mood-source-url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mood-notes">메모</Label>
            <Textarea
              id="mood-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="이 이미지에 대한 메모..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mood-tags">태그 (콤마로 구분)</Label>
            <Input
              id="mood-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="한옥, 바닥, 모던"
            />
          </div>

          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createMoodImage.isPending}>
              {createMoodImage.isPending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Loading Skeleton ---

function MoodboardLoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-md" />
        ))}
      </div>
      <div className="columns-2 md:columns-3 gap-3 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="break-inside-avoid">
            <Skeleton
              className={`w-full rounded-xl ${
                ["h-40", "h-48", "h-52"][i % 3]
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Page ---

export default function MoodboardPage() {
  const { data: moodImages, isLoading: imagesLoading } = useMoodImages();
  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const updateMoodImage = useUpdateMoodImage();
  const deleteMoodImage = useDeleteMoodImage();

  const [search, setSearch] = useState("");
  const [spaceFilter, setSpaceFilter] = useState<string>("전체");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const isLoading = imagesLoading || spacesLoading;

  const items = moodImages ?? [];
  const spacesList = spaces ?? [];

  // Filter items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        search === "" ||
        (item.notes && item.notes.includes(search)) ||
        (item.tags && item.tags.some((t) => t.includes(search)));

      const matchSpace =
        spaceFilter === "전체" || item.space_id === spaceFilter;

      return matchSearch && matchSpace;
    });
  }, [items, search, spaceFilter]);

  // Space counts
  const spaceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      if (item.space_id) {
        counts[item.space_id] = (counts[item.space_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [items]);

  function toggleLike(item: MoodImage) {
    updateMoodImage.mutate(
      { id: item.id, is_liked: !item.is_liked },
      {
        onSuccess: () => {
          if (!item.is_liked) {
            toast.success("좋아요에 추가했습니다");
          }
        },
        onError: () => {
          toast.error("업데이트에 실패했습니다");
        },
      }
    );
  }

  function handleDelete(item: MoodImage) {
    deleteMoodImage.mutate(item.id, {
      onSuccess: () => toast.success("이미지가 삭제되었습니다"),
      onError: () => toast.error("삭제에 실패했습니다"),
    });
  }

  if (isLoading) {
    return <MoodboardLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-bold">무드보드</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              인테리어 영감 모음 &middot; {items.length}개 이미지
            </p>
          </div>
          <Button size="default" onClick={() => setAddDialogOpen(true)}>
            <Plus weight="bold" className="size-4" />
            이미지 추가
          </Button>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="relative">
            <MagnifyingGlass
              weight="duotone"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <Input
              placeholder="메모, 태그 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </motion.div>

        {/* Space Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <FunnelSimple
            weight="duotone"
            className="size-4 text-muted-foreground shrink-0"
          />
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={spaceFilter === "전체" ? "default" : "outline"}
              size="xs"
              onClick={() => setSpaceFilter("전체")}
            >
              전체
            </Button>
            {spacesList.map((space) => (
              <Button
                key={space.id}
                variant={spaceFilter === space.id ? "default" : "outline"}
                size="xs"
                onClick={() => setSpaceFilter(space.id)}
              >
                {space.name}
                <span className="text-[10px] ml-0.5 opacity-60">
                  {spaceCounts[space.id] || 0}
                </span>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Masonry Grid */}
        {filtered.length > 0 ? (
          <div className="columns-2 md:columns-3 gap-3 space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, index) => (
                <MoodImageCard
                  key={item.id}
                  item={item}
                  index={index}
                  spaces={spacesList}
                  onToggleLike={() => toggleLike(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Images
              weight="duotone"
              className="size-12 text-muted-foreground/40 mx-auto mb-3"
            />
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "무드보드가 비어있습니다"
                : "조건에 맞는 이미지가 없습니다"}
            </p>
            {items.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus weight="bold" className="size-3.5" />
                첫 이미지 추가하기
              </Button>
            )}
          </motion.div>
        )}

        {/* Add Dialog */}
        <AddMoodImageDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          spaces={spacesList}
        />
      </div>
    </div>
  );
}
