"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Robot,
  X,
  PaperPlaneTilt,
  Paperclip,
  CircleNotch,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useChatMessages } from "@/lib/queries";
import { useSendMessage } from "@/lib/chat";
import type { ChatMessage } from "@/types/database";

// ---------------------------------------------------------------------------
// Action card for tool results
// ---------------------------------------------------------------------------

function ActionCard({ action }: { action: Record<string, unknown> }) {
  const type = action.type as string;
  const space = action.space as string;
  const category = action.category as string;

  if (type === "update_board_item") {
    const status = action.status as string | undefined;
    const decision = action.decision_content as string | undefined;
    const statusLabels: Record<string, string> = {
      undecided: "미정",
      has_candidates: "후보있음",
      decided: "결정됨",
      purchased: "구매완료",
      installed: "설치완료",
    };

    return (
      <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2.5 dark:border-green-900 dark:bg-green-950/50">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-green-700 dark:text-green-400">
          <CheckCircle size={14} weight="fill" />
          <span>
            {space} &gt; {category}
          </span>
          {decision && <span>을(를) &quot;{decision}&quot;로 기록</span>}
        </div>
        {status && (
          <p className="mt-1 text-[10px] text-green-600 dark:text-green-500">
            상태: {statusLabels[status] || status}
          </p>
        )}
      </div>
    );
  }

  if (type === "create_board_item") {
    return (
      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 dark:border-blue-900 dark:bg-blue-950/50">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
          <CheckCircle size={14} weight="fill" />
          <span>
            {space} &gt; {category} 항목 추가됨
          </span>
        </div>
      </div>
    );
  }

  if (type === "record_expense") {
    const costType = action.cost_type as string;
    const amount = action.amount as number;
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900 dark:bg-amber-950/50">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
          <CheckCircle size={14} weight="fill" />
          <span>
            {space} &gt; {category} {costType} {amount?.toLocaleString()}원 기록
          </span>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Single message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Robot size={14} weight="duotone" className="text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] ${
          isUser
            ? "rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground"
            : "rounded-2xl rounded-tl-sm bg-secondary px-3 py-2"
        }`}
      >
        <p className="whitespace-pre-wrap text-xs leading-relaxed">
          {msg.content}
        </p>
        {!isUser && msg.action_taken && (
          <ActionCard action={msg.action_taken} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick action chips
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  "화장실 조명 LED로 결정",
  "타일 가격 비교해줘",
  "이번주 할일 알려줘",
];

// ---------------------------------------------------------------------------
// FloatingChatBot component
// ---------------------------------------------------------------------------

export function FloatingChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], isLoading: isLoadingMessages } =
    useChatMessages();
  const sendMessage = useSendMessage();

  // Auto-scroll to bottom on new messages or when loading completes
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, sendMessage.isPending]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  async function handleSend(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || sendMessage.isPending) return;

    setInput("");

    try {
      await sendMessage.mutateAsync({
        message: messageText,
        userId: null,
      });
    } catch (error) {
      toast.error("메시지 전송에 실패했습니다.", {
        description:
          error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* FAB button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 md:bottom-6"
          >
            <Robot size={24} weight="fill" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 z-50 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border md:bottom-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Robot
                    size={16}
                    weight="duotone"
                    className="text-primary"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">HOMI 채팅</p>
                  <p className="text-[10px] text-muted-foreground">
                    무엇이든 물어보세요
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Welcome message (always shown) */}
              {!hasMessages && !isLoadingMessages && (
                <>
                  <div className="flex gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Robot
                        size={14}
                        weight="duotone"
                        className="text-primary"
                      />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-secondary px-3 py-2">
                      <p className="text-xs">
                        안녕하세요! 인테리어 프로젝트를 도와드릴게요.
                        <br />
                        <span className="text-muted-foreground">
                          결정사항 기록, 비용 입력, 질문 등 무엇이든 말씀하세요.
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Quick action chips */}
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {QUICK_ACTIONS.map((text) => (
                      <button
                        key={text}
                        onClick={() => handleSend(text)}
                        disabled={sendMessage.isPending}
                        className="rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Chat history */}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {/* Loading indicator */}
              {sendMessage.isPending && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Robot
                      size={14}
                      weight="duotone"
                      className="text-primary"
                    />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-secondary px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <CircleNotch
                        size={14}
                        className="animate-spin text-primary"
                      />
                      <span className="text-[11px] text-muted-foreground">
                        생각하고 있어요...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error indicator */}
              {sendMessage.isError && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <WarningCircle
                      size={14}
                      weight="duotone"
                      className="text-destructive"
                    />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-destructive/5 px-3 py-2">
                    <p className="text-[11px] text-destructive">
                      오류가 발생했습니다. 다시 시도해주세요.
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions when there are messages */}
            {hasMessages && !sendMessage.isPending && (
              <div className="border-t px-3 py-2">
                <div className="flex gap-1.5 overflow-x-auto">
                  {QUICK_ACTIONS.map((text) => (
                    <button
                      key={text}
                      onClick={() => handleSend(text)}
                      disabled={sendMessage.isPending}
                      className="shrink-0 rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t p-3">
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                <button className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Paperclip size={16} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지를 입력하세요..."
                  disabled={sendMessage.isPending}
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sendMessage.isPending}
                  className="shrink-0 rounded-lg bg-primary p-1.5 text-primary-foreground disabled:opacity-50"
                >
                  {sendMessage.isPending ? (
                    <CircleNotch size={14} className="animate-spin" />
                  ) : (
                    <PaperPlaneTilt size={14} weight="fill" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
