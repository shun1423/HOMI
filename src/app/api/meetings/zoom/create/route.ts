import { NextRequest, NextResponse } from "next/server";

async function getZoomAccessToken(): Promise<string | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) return null;

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=account_credentials&account_id=${accountId}`,
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export async function POST(request: NextRequest) {
  const token = await getZoomAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: "Zoom API가 설정되지 않았습니다. ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET을 확인해주세요." },
      { status: 500 }
    );
  }

  try {
    const { topic, startTime, duration } = await request.json() as {
      topic: string;
      startTime: string; // ISO 8601
      duration?: number; // minutes
    };

    const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration: duration ?? 60,
        timezone: "Asia/Seoul",
        settings: {
          join_before_host: true,
          auto_recording: "cloud",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Zoom create meeting error:", err);
      return NextResponse.json({ error: "Zoom 회의 생성 실패" }, { status: 502 });
    }

    const meeting = await res.json();

    return NextResponse.json({
      meetingId: String(meeting.id),
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url,
    });
  } catch (err) {
    console.error("Zoom create error:", err);
    return NextResponse.json({ error: "Zoom 회의 생성 중 오류" }, { status: 500 });
  }
}
