import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getZoomToken(projectId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("zoom_connections")
    .select("access_token, refresh_token")
    .eq("project_id", projectId)
    .single();

  if (!data) return null;

  // Try current token
  const testRes = await fetch("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  if (testRes.ok) return data.access_token;

  // Refresh token
  if (data.refresh_token) {
    const refreshRes = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
      }),
    });

    if (refreshRes.ok) {
      const newTokens = await refreshRes.json();
      await supabase
        .from("zoom_connections")
        .update({ access_token: newTokens.access_token, refresh_token: newTokens.refresh_token ?? data.refresh_token })
        .eq("project_id", projectId);
      return newTokens.access_token;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, topic, startTime, duration } = await request.json() as {
      projectId: string;
      topic: string;
      startTime: string;
      duration?: number;
    };

    if (!projectId) {
      return NextResponse.json({ error: "projectId 필요" }, { status: 400 });
    }

    const token = await getZoomToken(projectId);
    if (!token) {
      return NextResponse.json({ error: "Zoom 연결이 필요합니다. 회의 페이지에서 Zoom을 연결해주세요." }, { status: 401 });
    }

    const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: startTime,
        duration: duration ?? 60,
        timezone: "Asia/Seoul",
        settings: { join_before_host: true, auto_recording: "cloud" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Zoom create error:", err);
      return NextResponse.json({ error: "Zoom 회의 생성 실패" }, { status: 502 });
    }

    const meeting = await res.json();
    return NextResponse.json({
      meetingId: String(meeting.id),
      joinUrl: meeting.join_url,
    });
  } catch (err) {
    console.error("Zoom create error:", err);
    return NextResponse.json({ error: "회의 생성 오류" }, { status: 500 });
  }
}
