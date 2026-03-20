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

export async function GET(request: NextRequest) {
  const meetingId = request.nextUrl.searchParams.get("meetingId");
  if (!meetingId) {
    return NextResponse.json({ error: "meetingId 필요" }, { status: 400 });
  }

  const token = await getZoomAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Zoom API 미설정" }, { status: 500 });
  }

  try {
    // Get recordings
    const recRes = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!recRes.ok) {
      return NextResponse.json({ error: "녹화를 찾을 수 없습니다", recordingUrl: null, transcript: null });
    }

    const recData = await recRes.json();

    // Find video and transcript files
    const files = recData.recording_files ?? [];
    const videoFile = files.find((f: { recording_type: string }) =>
      f.recording_type === "shared_screen_with_speaker_view" || f.recording_type === "active_speaker"
    );
    const transcriptFile = files.find((f: { file_type: string }) =>
      f.file_type === "TRANSCRIPT"
    );

    let transcript = null;
    if (transcriptFile?.download_url) {
      // Download transcript
      const tRes = await fetch(`${transcriptFile.download_url}?access_token=${token}`);
      if (tRes.ok) {
        transcript = await tRes.text();
      }
    }

    return NextResponse.json({
      recordingUrl: videoFile?.play_url ?? recData.share_url ?? null,
      transcript,
      recordingFiles: files.map((f: { file_type: string; play_url?: string; download_url?: string; recording_type?: string }) => ({
        type: f.file_type,
        recordingType: f.recording_type,
        playUrl: f.play_url ?? null,
        downloadUrl: f.download_url ?? null,
      })),
    });
  } catch (err) {
    console.error("Zoom recording error:", err);
    return NextResponse.json({ error: "녹화 조회 실패" }, { status: 500 });
  }
}
