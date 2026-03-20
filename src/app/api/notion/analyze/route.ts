import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { createAdminClient } from "@/lib/supabase/admin";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4";

// Extract text content from Notion blocks
async function getPageContent(notion: Client, pageId: string): Promise<string> {
  const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
  const texts: string[] = [];

  for (const block of blocks.results) {
    const b = block as Record<string, unknown>;
    const type = b.type as string;
    const content = b[type] as { rich_text?: { plain_text?: string }[] } | undefined;
    if (content?.rich_text) {
      const text = content.rich_text.map((t) => t.plain_text ?? "").join("");
      if (text) texts.push(text);
    }
  }

  return texts.join("\n");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API 키 미설정" }, { status: 500 });
  }

  try {
    const { projectId, pageIds, prompt } = await request.json() as {
      projectId: string;
      pageIds: string[];
      prompt?: string;
    };

    if (!projectId || !pageIds?.length) {
      return NextResponse.json({ error: "projectId와 pageIds 필요" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: connection } = await supabase
      .from("notion_connections")
      .select("access_token")
      .eq("project_id", projectId)
      .single();

    if (!connection?.access_token) {
      return NextResponse.json({ error: "Notion 연결이 필요합니다" }, { status: 401 });
    }

    const notion = new Client({ auth: connection.access_token });

    // Get content from all pages
    const contents: string[] = [];
    for (const pageId of pageIds.slice(0, 5)) {
      const content = await getPageContent(notion, pageId);
      if (content) contents.push(content);
    }

    if (contents.length === 0) {
      return NextResponse.json({ error: "분석할 콘텐츠가 없습니다" }, { status: 400 });
    }

    const userPrompt = prompt || "이 프로젝트의 진행 상황을 분석하고 주요 인사이트와 추천사항을 알려주세요.";

    const llmPrompt = `당신은 한국의 인테리어/시공 프로젝트 분석 전문가입니다.

아래는 Notion에서 가져온 프로젝트 관련 문서입니다:

${contents.join("\n\n---\n\n")}

사용자 요청: ${userPrompt}

아래 JSON 형식으로만 응답해주세요:
{
  "summary": "전체 요약 (2-3문장)",
  "keyFindings": ["발견사항1", "발견사항2", ...],
  "recommendations": ["추천1", "추천2", ...],
  "analyzedAt": "${new Date().toISOString().slice(0, 16).replace("T", " ")}"
}`;

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: llmPrompt }],
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI 분석 실패" }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "응답 파싱 실패", raw: content }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("Notion analyze error:", err);
    return NextResponse.json({ error: "분석 중 오류 발생" }, { status: 500 });
  }
}
