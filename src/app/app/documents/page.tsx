"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  MagnifyingGlass,
  FolderOpen,
  CalendarBlank,
  Buildings,
  Tag,
  ShieldCheck,
  Receipt,
  File,
  Trash,
  Plus,
  SpinnerGap,
  NoteBlank,
  CloudArrowUp,
  DownloadSimple,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDocuments,
  useCreateDocument,
  useDeleteDocument,
  useContractors,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import type { DocType, Document } from "@/types/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type DocCategory = "전체" | "계약서" | "견적서" | "보증서" | "영수증" | "기타";

const CATEGORIES: DocCategory[] = ["전체", "계약서", "견적서", "보증서", "영수증", "기타"];

const DOC_TYPE_TO_LABEL: Record<DocType, Exclude<DocCategory, "전체">> = {
  contract: "계약서", estimate: "견적서", warranty: "보증서", receipt: "영수증", other: "기타",
};

const LABEL_TO_DOC_TYPE: Record<Exclude<DocCategory, "전체">, DocType> = {
  계약서: "contract", 견적서: "estimate", 보증서: "warranty", 영수증: "receipt", 기타: "other",
};

const CATEGORY_ICON: Record<Exclude<DocCategory, "전체">, React.ReactNode> = {
  계약서: <FileText weight="duotone" className="size-5 text-blue-500" />,
  견적서: <Receipt weight="duotone" className="size-5 text-amber-500" />,
  보증서: <ShieldCheck weight="duotone" className="size-5 text-emerald-500" />,
  영수증: <Receipt weight="duotone" className="size-5 text-rose-500" />,
  기타: <File weight="duotone" className="size-5 text-purple-500" />,
};

const CATEGORY_COLOR: Record<Exclude<DocCategory, "전체">, string> = {
  계약서: "bg-blue-500/10 text-blue-600",
  견적서: "bg-amber-500/10 text-amber-600",
  보증서: "bg-emerald-500/10 text-emerald-600",
  영수증: "bg-rose-500/10 text-rose-600",
  기타: "bg-purple-500/10 text-purple-600",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ---------------------------------------------------------------------------
// Document Form Dialog (add)
// ---------------------------------------------------------------------------

function DocumentFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createDocument = useCreateDocument();
  const { data: contractors } = useContractors();

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocType>("other");
  const [vendor, setVendor] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const allowed = ["image/", "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument"];
    if (!allowed.some((t) => file.type.startsWith(t))) {
      toast.error("이미지, PDF, Word 파일만 가능합니다");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("20MB 이하만 가능합니다");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "pdf";
      const path = `project-docs/${Date.now()}-${randomId()}.${ext}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) { toast.error("업로드 실패: " + error.message); return; }
      const { data } = supabase.storage.from("documents").getPublicUrl(path);
      setFileUrl(data.publicUrl);
      setFileSize(formatFileSize(file.size));
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      toast.success("파일이 업로드되었습니다");
    } catch {
      toast.error("업로드 오류");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("문서 제목을 입력해주세요"); return; }

    createDocument.mutate(
      {
        title: title.trim(),
        doc_type: docType,
        file_url: fileUrl || null,
        file_size: fileSize || null,
        vendor: vendor.trim() || null,
        contractor_id: contractorId || null,
        date: date || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => { toast.success("문서가 추가되었습니다"); onOpenChange(false); },
        onError: () => toast.error("추가 실패"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>문서 추가</DialogTitle>
          <DialogDescription>새 문서를 업로드하고 정보를 입력합니다</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* File upload */}
          <div
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed py-5 transition-colors ${
              fileUrl ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10" : "border-border hover:border-primary/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
            {uploading ? (
              <>
                <SpinnerGap size={24} weight="bold" className="animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">업로드 중...</p>
              </>
            ) : fileUrl ? (
              <>
                <File size={24} weight="duotone" className="text-emerald-500" />
                <p className="text-xs text-emerald-600 font-medium">파일 업로드 완료</p>
                {fileSize && <p className="text-[10px] text-muted-foreground">{fileSize}</p>}
                <p className="text-[10px] text-muted-foreground">클릭하여 다른 파일로 변경</p>
              </>
            ) : (
              <>
                <CloudArrowUp size={24} weight="duotone" className="text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">클릭하여 파일 업로드</p>
                <p className="text-[10px] text-muted-foreground/60">PDF, 이미지, Word (최대 20MB)</p>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>제목 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="문서 제목" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>분류</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">계약서</SelectItem>
                  <SelectItem value="estimate">견적서</SelectItem>
                  <SelectItem value="warranty">보증서</SelectItem>
                  <SelectItem value="receipt">영수증</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>날짜</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>업체명</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="업체명" />
            </div>
            <div className="space-y-1.5">
              <Label>시공업자</Label>
              <Select value={contractorId} onValueChange={(v) => setContractorId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">없음</SelectItem>
                  {(contractors ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>메모</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="메모 (선택)" rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={createDocument.isPending}>
              {createDocument.isPending ? "저장 중..." : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DocCategory>("전체");
  const [addOpen, setAddOpen] = useState(false);

  const { data: documents, isLoading } = useDocuments();
  const { data: contractors } = useContractors();
  const deleteDocument = useDeleteDocument();

  const allDocs = documents ?? [];

  const filtered = allDocs.filter((doc) => {
    const label = DOC_TYPE_TO_LABEL[doc.doc_type];
    const matchSearch =
      search === "" ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      (doc.vendor ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "전체" || label === categoryFilter;
    return matchSearch && matchCategory;
  });

  const getContractorName = (cid: string | null) => {
    if (!cid || !contractors) return null;
    return contractors.find((c) => c.id === cid)?.name ?? null;
  };

  function handleDelete(doc: Document) {
    if (!confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) return;

    // Storage에서도 삭제
    if (doc.file_url) {
      const path = doc.file_url.split("/storage/v1/object/public/documents/")[1];
      if (path) {
        const supabase = createClient();
        supabase.storage.from("documents").remove([path]);
      }
    }

    deleteDocument.mutate(doc.id, {
      onSuccess: () => toast.success("문서가 삭제되었습니다"),
      onError: () => toast.error("삭제 실패"),
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <div><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-56 mt-1.5" /></div>
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">문서 보관함</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allDocs.length > 0
                ? `총 ${allDocs.length}개 문서`
                : "계약서, 견적서, 보증서 등 프로젝트 문서 관리"}
            </p>
          </div>
          <Button size="default" onClick={() => setAddOpen(true)}>
            <Plus weight="bold" className="size-4" />
            추가
          </Button>
        </motion.div>

        {/* Search + Filter */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
          <div className="relative">
            <MagnifyingGlass weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="문서명 또는 업체명 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Tag weight="duotone" className="size-4 text-muted-foreground shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <Button key={cat} variant={categoryFilter === cat ? "default" : "outline"} size="xs" onClick={() => setCategoryFilter(cat)}>
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Document List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((doc, index) => {
              const label = DOC_TYPE_TO_LABEL[doc.doc_type];
              const contractorName = getContractorName(doc.contractor_id);
              const displayVendor = doc.vendor ?? contractorName;
              const hasFile = !!doc.file_url;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.04 }}
                  layout
                >
                  <Card className="overflow-hidden hover:ring-1 hover:ring-primary/10 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${CATEGORY_COLOR[label]}`}>
                          {CATEGORY_ICON[label]}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold truncate">{doc.title}</h3>
                            <Badge variant="secondary" className={`text-[10px] shrink-0 ${CATEGORY_COLOR[label]}`}>
                              {label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            {displayVendor && (
                              <span className="flex items-center gap-1">
                                <Buildings weight="duotone" className="size-3" />
                                {displayVendor}
                              </span>
                            )}
                            {doc.date && (
                              <span className="flex items-center gap-1">
                                <CalendarBlank weight="duotone" className="size-3" />
                                {doc.date}
                              </span>
                            )}
                            {doc.file_size && <span>{doc.file_size}</span>}
                          </div>
                          {doc.notes && (
                            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                              <NoteBlank weight="duotone" className="size-3 shrink-0" />
                              <span className="truncate">{doc.notes}</span>
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 shrink-0">
                          {hasFile && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => window.open(doc.file_url!, "_blank")}
                              title="파일 열기"
                            >
                              <ArrowSquareOut weight="duotone" className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash weight="duotone" className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <FolderOpen weight="duotone" className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search || categoryFilter !== "전체" ? "조건에 맞는 문서가 없습니다" : "아직 등록된 문서가 없습니다"}
            </p>
          </motion.div>
        )}

        {/* Form Dialog */}
        {addOpen && <DocumentFormDialog open={addOpen} onOpenChange={setAddOpen} />}
      </div>
    </div>
  );
}
