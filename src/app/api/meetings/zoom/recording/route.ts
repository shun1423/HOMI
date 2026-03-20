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

  const testRes = await fetch("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  if (testRes.ok) return data.access_token;

  if (data.refresh_token) {
    const refreshRes = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: data.refresh_token }),
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

export async function GET(request: NextRequest) {
  const meetingId = request.nextUrl.searchParams.get("meetingId");
  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!meetingId || !projectId) {
    return NextResponse.json({ error: "meetingId와 projectId 필요" }, { status: 400 });
  }

  const token = await getZoomToken(projectId);
  if (!token) {
    return NextResponse.json({ error: "Zoom 연결 필요" }, { status: 401 });
  }

  try {
    const recRes = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!recRes.ok) {
      return NextResponse.json({ recordingUrl: null, transcript: null });
    }

    const recData = await recRes.json();
    const files = recData.recording_files ?? [];

    const videoFile = files.find((f: { recording_type: string }) =>
      f.recording_type === "shared_screen_with_speaker_view" || f.recording_type === "active_speaker"
    );
    const transcriptFile = files.find((f: { file_type: string }) => f.file_type === "TRANSCRIPT");

    let transcript = null;
    if (transcriptFile?.download_url) {
      const tRes = await fetch(`${transcriptFile.download_url}?access_token=${token}`);
      if (tRes.ok) transcript = await tRes.text();
    }

    return NextResponse.json({
      recordingUrl: videoFile?.play_url ?? recData.share_url ?? null,
      transcript,
    });
  } catch (err) {
    console.error("Zoom recording error:", err);
    return NextResponse.json({ error: "녹화 조회 실패" }, { status: 500 });
  }
}
