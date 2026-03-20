import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Notion OAuth가 설정되지 않았습니다. NOTION_CLIENT_ID와 NOTION_REDIRECT_URI를 확인해주세요." },
      { status: 500 }
    );
  }

  // Pass projectId as state so we can link it after callback
  const projectId = request.nextUrl.searchParams.get("projectId") ?? "";
  const state = Buffer.from(JSON.stringify({ projectId })).toString("base64url");

  const notionAuthUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  notionAuthUrl.searchParams.set("client_id", clientId);
  notionAuthUrl.searchParams.set("redirect_uri", redirectUri);
  notionAuthUrl.searchParams.set("response_type", "code");
  notionAuthUrl.searchParams.set("owner", "user");
  notionAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(notionAuthUrl.toString());
}
