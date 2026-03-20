import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });
  }

  try {
    const { transcript, agenda } = await request.json() as {
      transcript: string;
      agenda?: string;
    };

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "회의록을 입력해주세요" }, { status: 400 });
    }

    const prompt = `당신은 한국의 인테리어/시공 프로젝트 회의록 분석 전문가입니다.

아래 회의 내용을 분석해서 구조화된 결과를 만들어주세요.
${agenda ? `\n회의 안건:\n${agenda}\n` : ""}
회의 내용:
${transcript}

아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "summary": "회의 전체 요약 (2-3문장)",
  "decisions": [
    {
      "id": "d1",
      "content": "결정 내용",
      "boardItemHint": "관련 보드 항목이 있으면 (예: 화장실 세면대), 없으면 null"
    }
  ],
  "actionItems": [
    {
      "id": "a1",
      "content": "할 일 내용",
      "assignee": "담당자 이름 (알 수 있으면, 없으면 null)",
      "dueDate": "기한 (YYYY-MM-DD 형식, 알 수 있으면, 없으면 null)"
    }
  ],
  "keyPoints": ["핵심 논의사항1", "핵심 논의사항2"]
}`;

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenRouter error:", res.status, errText);
      return NextResponse.json({ error: `AI 분석 실패 (${res.status})` }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "응답 파싱 실패", raw: content }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("Meeting analyze error:", err);
    return NextResponse.json({ error: "분석 중 오류 발생" }, { status: 500 });
  }
}
