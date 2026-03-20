import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PROJECT_ID = "a1b2c3d4-0000-0000-0000-000000000001";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4";

// ---------------------------------------------------------------------------
// Tool definitions for Claude
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "update_board_item",
      description:
        "기존 보드 아이템을 업데이트합니다. 사용자가 특정 공간의 항목에 대해 결정을 내리거나 상태를 변경할 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          space_name: {
            type: "string",
            description: "공간 이름 (예: 화장실, 주방, 거실)",
          },
          category: {
            type: "string",
            description: "카테고리 이름 (예: 세면대, 조명, 타일)",
          },
          status: {
            type: "string",
            enum: [
              "undecided",
              "has_candidates",
              "decided",
              "purchased",
              "installed",
            ],
            description: "상태 변경 (선택)",
          },
          decision_content: {
            type: "string",
            description: "결정 내용 (선택)",
          },
          estimated_budget: {
            type: "number",
            description: "예상 비용 (원, 선택)",
          },
          cost_material: {
            type: "number",
            description: "자재비 (원, 선택)",
          },
          cost_labor: {
            type: "number",
            description: "인건비 (원, 선택)",
          },
        },
        required: ["space_name", "category"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_board_item",
      description:
        "새로운 보드 아이템을 생성합니다. 아직 보드에 없는 새 항목을 추가할 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          space_name: {
            type: "string",
            description: "공간 이름 (예: 화장실, 주방, 거실)",
          },
          category: {
            type: "string",
            description: "카테고리 이름 (예: 세면대, 조명, 타일)",
          },
          status: {
            type: "string",
            enum: [
              "undecided",
              "has_candidates",
              "decided",
              "purchased",
              "installed",
            ],
            description: "초기 상태 (기본: undecided)",
          },
          decision_content: {
            type: "string",
            description: "결정 내용 (선택)",
          },
          estimated_budget: {
            type: "number",
            description: "예상 비용 (원, 선택)",
          },
        },
        required: ["space_name", "category"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "record_expense",
      description:
        "비용을 기록합니다. 사용자가 자재비, 인건비, 배송비 등을 입력할 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          space_name: {
            type: "string",
            description: "공간 이름 (예: 화장실, 주방, 거실)",
          },
          category: {
            type: "string",
            description: "카테고리 이름 (예: 세면대, 조명, 타일)",
          },
          amount: {
            type: "number",
            description: "금액 (원)",
          },
          cost_type: {
            type: "string",
            enum: ["material", "labor", "delivery"],
            description: "비용 종류",
          },
        },
        required: ["space_name", "category", "amount", "cost_type"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SpaceContext {
  id: string;
  name: string;
}

interface BoardItemContext {
  id: string;
  space_id: string;
  space_name: string;
  category: string;
  status: string;
  decision_content: string | null;
  estimated_budget: number | null;
  cost_material: number | null;
  cost_labor: number | null;
  cost_delivery: number | null;
}

function buildSystemPrompt(
  spaces: SpaceContext[],
  boardItems: BoardItemContext[]
) {
  const statusMap: Record<string, string> = {
    undecided: "미정",
    has_candidates: "후보있음",
    decided: "결정됨",
    purchased: "구매완료",
    installed: "설치완료",
  };

  const contextLines: string[] = [];

  for (const space of spaces) {
    const items = boardItems.filter((bi) => bi.space_id === space.id);
    if (items.length === 0) {
      contextLines.push(`\n[${space.name}] - 등록된 항목 없음`);
      continue;
    }
    contextLines.push(`\n[${space.name}]`);
    for (const item of items) {
      const parts = [`  - ${item.category}: ${statusMap[item.status] || item.status}`];
      if (item.decision_content) parts.push(`결정="${item.decision_content}"`);
      if (item.estimated_budget)
        parts.push(`예산=${item.estimated_budget.toLocaleString()}원`);
      if (item.cost_material)
        parts.push(`자재비=${item.cost_material.toLocaleString()}원`);
      if (item.cost_labor)
        parts.push(`인건비=${item.cost_labor.toLocaleString()}원`);
      if (item.cost_delivery)
        parts.push(`배송비=${item.cost_delivery.toLocaleString()}원`);
      contextLines.push(parts.join(" | "));
    }
  }

  return `당신은 집 인테리어/시공 프로젝트를 도와주는 AI 어시스턴트입니다.
사용자는 인테리어 프로젝트를 진행하고 있습니다.

현재 프로젝트 보드 현황:
${contextLines.join("\n")}

규칙:
1. 사용자가 결정사항을 기록하거나 비용을 입력하려 할 때는 반드시 적절한 tool을 호출하세요.
2. 공간 이름과 카테고리는 기존 보드의 이름과 최대한 일치시키세요.
3. 단순 질문이나 조언 요청에는 tool 없이 텍스트로 답변하세요.
4. 답변은 항상 한국어로, 친절하고 간결하게 합니다.
5. 금액은 한국 원화(원)으로 처리합니다.
6. 이미 보드에 있는 항목은 update_board_item을, 없는 항목은 create_board_item을 사용하세요.
7. 비용 기록 시 record_expense를 사용하세요.`;
}

function findSpace(
  spaces: SpaceContext[],
  name: string
): SpaceContext | undefined {
  // exact match first
  const exact = spaces.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  if (exact) return exact;
  // partial match
  return spaces.find(
    (s) =>
      s.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(s.name.toLowerCase())
  );
}

function findBoardItem(
  boardItems: BoardItemContext[],
  spaceId: string,
  category: string
): BoardItemContext | undefined {
  const exact = boardItems.find(
    (bi) =>
      bi.space_id === spaceId &&
      bi.category.toLowerCase() === category.toLowerCase()
  );
  if (exact) return exact;
  return boardItems.find(
    (bi) =>
      bi.space_id === spaceId &&
      (bi.category.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(bi.category.toLowerCase()))
  );
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

interface ToolCallArgs {
  space_name: string;
  category: string;
  status?: string;
  decision_content?: string;
  estimated_budget?: number;
  cost_material?: number;
  cost_labor?: number;
  amount?: number;
  cost_type?: "material" | "labor" | "delivery";
}

async function executeToolCall(
  toolName: string,
  args: ToolCallArgs,
  spaces: SpaceContext[],
  boardItems: BoardItemContext[]
): Promise<{
  success: boolean;
  action_taken: Record<string, unknown> | null;
  message: string;
}> {
  const supabase = createAdminClient();
  const space = findSpace(spaces, args.space_name);

  if (!space) {
    return {
      success: false,
      action_taken: null,
      message: `"${args.space_name}" 공간을 찾을 수 없습니다.`,
    };
  }

  if (toolName === "update_board_item") {
    const item = findBoardItem(boardItems, space.id, args.category);
    if (!item) {
      return {
        success: false,
        action_taken: null,
        message: `"${space.name}" > "${args.category}" 항목을 찾을 수 없습니다.`,
      };
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (args.status) updates.status = args.status;
    if (args.decision_content) updates.decision_content = args.decision_content;
    if (args.estimated_budget !== undefined)
      updates.estimated_budget = args.estimated_budget;
    if (args.cost_material !== undefined)
      updates.cost_material = args.cost_material;
    if (args.cost_labor !== undefined) updates.cost_labor = args.cost_labor;

    const { error } = await supabase
      .from("board_items")
      .update(updates)
      .eq("id", item.id);

    if (error) {
      return { success: false, action_taken: null, message: error.message };
    }

    return {
      success: true,
      action_taken: {
        type: "update_board_item",
        space: space.name,
        category: args.category,
        ...updates,
      },
      message: `${space.name} > ${args.category}을(를) 업데이트했습니다.`,
    };
  }

  if (toolName === "create_board_item") {
    const { error } = await supabase.from("board_items").insert({
      project_id: PROJECT_ID,
      space_id: space.id,
      category: args.category,
      status: args.status || "undecided",
      decision_content: args.decision_content || null,
      estimated_budget: args.estimated_budget || null,
    });

    if (error) {
      return { success: false, action_taken: null, message: error.message };
    }

    return {
      success: true,
      action_taken: {
        type: "create_board_item",
        space: space.name,
        category: args.category,
        status: args.status || "undecided",
        decision_content: args.decision_content || null,
      },
      message: `${space.name} > ${args.category} 항목을 새로 추가했습니다.`,
    };
  }

  if (toolName === "record_expense") {
    const item = findBoardItem(boardItems, space.id, args.category);
    if (!item) {
      return {
        success: false,
        action_taken: null,
        message: `"${space.name}" > "${args.category}" 항목을 찾을 수 없습니다.`,
      };
    }

    const costField =
      args.cost_type === "material"
        ? "cost_material"
        : args.cost_type === "labor"
          ? "cost_labor"
          : "cost_delivery";

    const costLabel =
      args.cost_type === "material"
        ? "자재비"
        : args.cost_type === "labor"
          ? "인건비"
          : "배송비";

    const { error } = await supabase
      .from("board_items")
      .update({
        [costField]: args.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      return { success: false, action_taken: null, message: error.message };
    }

    return {
      success: true,
      action_taken: {
        type: "record_expense",
        space: space.name,
        category: args.category,
        cost_type: costLabel,
        amount: args.amount,
      },
      message: `${space.name} > ${args.category}의 ${costLabel}을 ${args.amount?.toLocaleString()}원으로 기록했습니다.`,
    };
  }

  return { success: false, action_taken: null, message: "알 수 없는 도구입니다." };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

interface ChatRequestBody {
  message: string;
  projectContext: {
    spaces: SpaceContext[];
    boardItems: BoardItemContext[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, projectContext } = body;

    if (!message || !projectContext) {
      return NextResponse.json(
        { error: "message와 projectContext가 필요합니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt(
      projectContext.spaces,
      projectContext.boardItems
    );

    // Call OpenRouter
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        tools: TOOLS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      return NextResponse.json(
        { error: `AI 호출 실패: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      return NextResponse.json(
        { error: "AI 응답이 비어있습니다." },
        { status: 502 }
      );
    }

    const assistantMessage = choice.message;

    // Check for tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs: ToolCallArgs = JSON.parse(toolCall.function.arguments);

      // Execute the tool
      const result = await executeToolCall(
        toolName,
        toolArgs,
        projectContext.spaces,
        projectContext.boardItems
      );

      // Call Claude again with tool result to get a natural response
      const followUpResponse = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
            assistantMessage,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            },
          ],
        }),
      });

      let content = result.message;
      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const followUpContent =
          followUpData.choices?.[0]?.message?.content;
        if (followUpContent) {
          content = followUpContent;
        }
      }

      return NextResponse.json({
        role: "assistant" as const,
        content,
        intent: result.success ? "update" : null,
        action_taken: result.action_taken,
      });
    }

    // No tool call — plain text response
    return NextResponse.json({
      role: "assistant" as const,
      content: assistantMessage.content || "응답을 생성할 수 없습니다.",
      intent: "question" as const,
      action_taken: null,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
