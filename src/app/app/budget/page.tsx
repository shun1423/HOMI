"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  CurrencyKrw,
  Plus,
  ShoppingCart,
  Truck,
  Hammer,
  DotsThree,
  Trash,
  CheckCircle,
  WarningCircle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useBoardItems,
  useSpaces,
} from "@/lib/queries";
import type { Expense, ExpenseCategory, BoardItem, Space } from "@/types/database";

// --- Helpers ---

function formatKRW(amount: number) {
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

function formatKRWFull(amount: number) {
  return `${amount.toLocaleString()}원`;
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "자재", label: "자재" },
  { value: "인건비", label: "인건비" },
  { value: "배송비", label: "배송비" },
  { value: "기타", label: "기타" },
];

const CATEGORY_COLORS: Record<string, string> = {
  자재: "bg-chart-1",
  인건비: "bg-chart-2",
  배송비: "bg-chart-3",
  기타: "bg-chart-4",
};

const CATEGORY_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  자재: "default",
  인건비: "secondary",
  배송비: "outline",
  기타: "outline",
};

function getCategoryIcon(category: string | null) {
  switch (category) {
    case "자재":
      return <ShoppingCart weight="duotone" className="size-4 text-chart-1" />;
    case "인건비":
      return <Hammer weight="duotone" className="size-4 text-chart-2" />;
    case "배송비":
      return <Truck weight="duotone" className="size-4 text-chart-3" />;
    default:
      return <DotsThree weight="duotone" className="size-4 text-chart-4" />;
  }
}

// --- Expense Form Dialog ---

function ExpenseFormDialog({
  open,
  onOpenChange,
  boardItems,
  spaces,
  expense,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardItems: BoardItem[];
  spaces: Space[];
  expense?: Expense;
  onDelete?: (id: string) => void;
}) {
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isEditing = !!expense;

  const [amount, setAmount] = useState(expense?.amount != null ? String(expense.amount) : "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [vendor, setVendor] = useState(expense?.vendor ?? "");
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>(expense?.category ?? "");
  const [boardItemId, setBoardItemId] = useState(expense?.board_item_id ?? "");

  const isPending = createExpense.isPending || updateExpense.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || !date) return;

    const payload = {
      amount: numAmount,
      date,
      description: description.trim() || null,
      vendor: vendor.trim() || null,
      category: (category as ExpenseCategory) || null,
      board_item_id: boardItemId || null,
    };

    if (isEditing) {
      updateExpense.mutate(
        { id: expense.id, ...payload },
        {
          onSuccess: () => { toast.success("지출이 수정되었습니다"); onOpenChange(false); },
          onError: () => toast.error("수정 실패"),
        }
      );
    } else {
      createExpense.mutate(payload, {
        onSuccess: () => { toast.success("지출이 추가되었습니다"); onOpenChange(false); },
        onError: () => toast.error("추가 실패"),
      });
    }
  }

  // Group board items by space
  const boardItemsBySpace = useMemo(() => {
    const groups: Record<string, { space: Space; items: BoardItem[] }> = {};
    for (const item of boardItems) {
      const space = spaces.find((s) => s.id === item.space_id);
      if (!space) continue;
      if (!groups[space.id]) {
        groups[space.id] = { space, items: [] };
      }
      groups[space.id].items.push(item);
    }
    return Object.values(groups);
  }, [boardItems, spaces]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "지출 수정" : "지출 추가"}</DialogTitle>
          <DialogDescription>{isEditing ? "지출 내역을 수정합니다." : "새 지출 내역을 추가합니다."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">금액 (원) *</Label>
              <Input
                id="exp-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">날짜 *</Label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">설명</Label>
            <Input
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="지출 설명"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-vendor">판매처</Label>
              <Input
                id="exp-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="판매처명"
              />
            </div>
            <div className="space-y-1.5">
              <Label>카테고리</Label>
              <Select value={category} onValueChange={(v) => setCategory(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">미분류</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>관련 항목</Label>
            <Select value={boardItemId} onValueChange={(v) => setBoardItemId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">없음</SelectItem>
                {boardItemsBySpace.map((group) => (
                  <div key={group.space.id}>
                    <div className="px-1.5 py-1 text-xs text-muted-foreground font-medium">
                      {group.space.name}
                    </div>
                    {group.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.category}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className={isEditing && onDelete ? "flex justify-between sm:justify-between" : ""}>
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("이 지출을 삭제하시겠습니까?")) {
                    onDelete(expense.id);
                    onOpenChange(false);
                  }
                }}
              >
                <Trash weight="duotone" className="size-4" /> 삭제
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
              <Button type="submit" disabled={isPending || !amount || !date}>
                {isPending ? "저장 중..." : isEditing ? "수정" : "추가"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Loading Skeleton ---

function BudgetSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-44 mt-1" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// --- Page ---

export default function BudgetPage() {
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: boardItems = [], isLoading: boardItemsLoading } = useBoardItems();
  const { data: spaces = [], isLoading: spacesLoading } = useSpaces();
  const deleteExpense = useDeleteExpense();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const isLoading = expensesLoading || boardItemsLoading || spacesLoading;

  // --- Computed data ---

  const totalBudget = useMemo(
    () =>
      boardItems.reduce((sum, item) => sum + (item.estimated_budget ?? 0), 0),
    [boardItems]
  );

  const totalSpent = useMemo(
    () => expenses.reduce((sum, exp) => sum + exp.amount, 0),
    [expenses]
  );

  const usedPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const remaining = totalBudget - totalSpent;

  // Space-by-space budget vs actual
  const spaceBudgets = useMemo(() => {
    return spaces.map((space) => {
      const spaceItems = boardItems.filter((bi) => bi.space_id === space.id);
      const budget = spaceItems.reduce(
        (sum, item) => sum + (item.estimated_budget ?? 0),
        0
      );
      // Get expenses linked to board items in this space
      const spaceItemIds = new Set(spaceItems.map((i) => i.id));
      const actual = expenses
        .filter((e) => e.board_item_id && spaceItemIds.has(e.board_item_id))
        .reduce((sum, e) => sum + e.amount, 0);
      return { space, budget, actual };
    }).filter((s) => s.budget > 0 || s.actual > 0);
  }, [spaces, boardItems, expenses]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const exp of expenses) {
      const cat = exp.category ?? "기타";
      groups[cat] = (groups[cat] ?? 0) + exp.amount;
    }
    const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    return entries.map(([name, amount]) => ({
      name,
      amount,
      percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      color: CATEGORY_COLORS[name] ?? "bg-gray-500",
    }));
  }, [expenses, totalSpent]);

  function handleDelete(id: string) {
    if (!confirm("이 지출을 삭제하시겠습니까?")) return;
    deleteExpense.mutate(id, {
      onSuccess: () => toast.success("지출이 삭제되었습니다"),
      onError: () => toast.error("삭제 실패"),
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <BudgetSkeleton />
        </div>
      </div>
    );
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
            <h1 className="text-xl font-bold">예산 관리</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              예산 현황
            </p>
          </div>
          <Button size="default" onClick={() => { setEditingExpense(undefined); setShowForm(true); }}>
            <Plus weight="bold" className="size-4" />
            지출 추가
          </Button>
        </motion.div>

        {/* Total Budget Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">총 예산</p>
                  <p className="text-2xl font-bold">
                    {totalBudget > 0 ? formatKRW(totalBudget) : "미설정"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">잔여</p>
                  <p
                    className={`text-lg font-semibold ${remaining >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {totalBudget > 0 ? formatKRW(remaining) : "-"}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {totalBudget > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>지출 {formatKRW(totalSpent)}</span>
                    <span>{usedPercentage}% 사용</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(usedPercentage, 100)}%`,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${usedPercentage > 100 ? "bg-destructive" : "bg-primary"}`}
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">총 지출</div>
                  <div className="font-semibold text-sm mt-0.5">
                    {formatKRW(totalSpent)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">건수</div>
                  <div className="font-semibold text-sm mt-0.5">
                    {expenses.length}건
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">
                    예산 건전성
                  </div>
                  <div className="font-semibold text-sm mt-0.5 flex items-center justify-center gap-1">
                    {totalBudget === 0 ? (
                      <span className="text-muted-foreground">-</span>
                    ) : usedPercentage <= 80 ? (
                      <>
                        <CheckCircle weight="duotone" className="size-4 text-success" />
                        <span className="text-success">양호</span>
                      </>
                    ) : usedPercentage <= 100 ? (
                      <>
                        <WarningCircle weight="duotone" className="size-4 text-warning" />
                        <span className="text-warning">주의</span>
                      </>
                    ) : (
                      <>
                        <WarningCircle weight="duotone" className="size-4 text-destructive" />
                        <span className="text-destructive">초과</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Space Budget Table */}
        {spaceBudgets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>공간별 예산 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>공간</TableHead>
                      <TableHead className="text-right">예산</TableHead>
                      <TableHead className="text-right">지출</TableHead>
                      <TableHead className="text-right">잔여</TableHead>
                      <TableHead>진행률</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spaceBudgets.map((item, index) => {
                      const pct =
                        item.budget > 0
                          ? Math.round((item.actual / item.budget) * 100)
                          : 0;
                      const isOver = item.actual > item.budget;

                      return (
                        <TableRow key={item.space.id}>
                          <TableCell className="font-medium">
                            {item.space.name}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatKRW(item.budget)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatKRW(item.actual)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                isOver ? "text-destructive" : "text-success"
                              }
                            >
                              {formatKRW(item.budget - item.actual)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${Math.min(pct, 100)}%`,
                                  }}
                                  transition={{
                                    delay: 0.2 + index * 0.05,
                                    duration: 0.5,
                                  }}
                                  className={`h-full rounded-full ${isOver ? "bg-destructive" : pct > 70 ? "bg-warning" : "bg-primary"}`}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">
                                {pct}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>카테고리별 지출</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stacked bar */}
                <div className="h-8 rounded-lg overflow-hidden flex">
                  {categoryBreakdown.map((cat, i) => (
                    <motion.div
                      key={cat.name}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                      className={`${cat.color} flex items-center justify-center`}
                    >
                      <span className="text-[10px] text-white font-medium">
                        {cat.percentage >= 10
                          ? `${cat.name} ${cat.percentage}%`
                          : ""}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categoryBreakdown.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className={`size-3 rounded-sm ${cat.color}`} />
                      <div>
                        <div className="text-xs font-medium">{cat.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatKRW(cat.amount)} ({cat.percentage}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>지출 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <CurrencyKrw
                    weight="duotone"
                    className="size-10 text-muted-foreground/40 mx-auto mb-3"
                  />
                  <p className="text-sm text-muted-foreground">
                    아직 지출 내역이 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense, index) => (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.03 }}
                      className="flex items-center justify-between py-2 border-b last:border-0 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="rounded-lg bg-muted p-2 shrink-0">
                          {getCategoryIcon(expense.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {expense.description ?? "설명 없음"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {expense.date}
                            {expense.vendor && ` \u00b7 ${expense.vendor}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatKRWFull(expense.amount)}
                          </div>
                          {expense.category && (
                            <Badge
                              variant={
                                CATEGORY_BADGE_VARIANT[expense.category] ??
                                "outline"
                              }
                              className="text-[10px]"
                            >
                              {expense.category}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => { setEditingExpense(expense); setShowForm(true); }}
                        >
                          <PencilSimple weight="duotone" className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash weight="duotone" className="size-3 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Form Dialog */}
        {showForm && (
          <ExpenseFormDialog
            key={editingExpense?.id ?? "new"}
            open={showForm}
            onOpenChange={setShowForm}
            boardItems={boardItems}
            spaces={spaces}
            expense={editingExpense}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
