import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const redirectUri = process.env.ZOOM_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Zoom OAuth 미설정" }, { status: 500 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId") ?? "";
  const state = Buffer.from(JSON.stringify({ projectId })).toString("base64url");

  const authUrl = new URL("https://zoom.us/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
