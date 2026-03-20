import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4";

interface PlaceInput {
  id: string;
  name: string;
  address: string | null;
  business_hours: string | null;
  category: string | null;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { places, date, notes, departureLocation, departureAddress, departureTime } = body as {
      places: PlaceInput[];
      date: string;
      notes?: string;
      departureLocation?: string;
      departureAddress?: string;
      departureTime?: string;
    };

    if (!places || places.length === 0) {
      return NextResponse.json({ error: "장소를 선택해주세요" }, { status: 400 });
    }

    const placesInfo = places
      .map(
        (p, i) =>
          `${i + 1}. [ID: ${p.id}] ${p.name}${p.address ? ` (${p.address})` : ""}${p.business_hours ? ` [영업: ${p.business_hours}]` : ""}${p.category ? ` - ${p.category}` : ""}`
      )
      .join("\n");

    const departureInfo = departureLocation || departureTime
      ? `\n출발지: ${departureLocation || "미정"}${departureAddress ? ` (${departureAddress})` : ""}${departureTime ? ` — ${departureTime} 출발` : ""}`
      : "";

    const prompt = `당신은 한국의 인테리어/시공 프로젝트를 위한 방문 스케줄 플래너입니다.

아래 장소들을 ${date}에 방문하려고 합니다. 각 장소의 위치(주소)와 영업시간을 고려하여 최적의 방문 순서와 시간을 추천해주세요.
${departureInfo}

방문할 장소:
${placesInfo}
${notes ? `\n추가 요청사항: ${notes}` : ""}

규칙:
- 출발지가 있으면 출발지에서 가까운 곳부터 시작하고, 마지막도 출발지로 돌아오기 편한 순서로 배치
- 출발 시간이 있으면 그 시간 이후부터 첫 방문지 도착 시간을 계산
- 지리적으로 가까운 곳끼리 묶어서 이동을 최소화
- 영업시간이 있으면 그 시간 내에 방문하도록 배치
- 각 장소당 방문 시간은 30분~1시간 정도 예상
- 이동 시간도 고려 (같은 지역이면 15~30분, 다른 지역이면 30분~1시간)
- 점심시간(12:00~13:00) 고려

아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이).
place_id는 반드시 위 목록의 [ID: ...] 값을 그대로 사용하세요:
{
  "schedule": [
    {
      "place_id": "위 목록의 ID 값을 그대로 사용",
      "arrival": "HH:MM",
      "departure": "HH:MM",
      "notes": "간단한 메모 (이동시간, 추천이유 등)"
    }
  ],
  "summary": "전체 스케줄 요약 한 줄"
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
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenRouter error:", res.status, errText);
      return NextResponse.json(
        { error: `LLM 요청 실패 (${res.status})`, detail: errText },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "응답 파싱 실패", raw: content }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Schedule suggest error:", err);
    return NextResponse.json({ error: "스케줄 생성 실패" }, { status: 500 });
  }
}
