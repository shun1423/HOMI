import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/app/notion?error=no_code", request.url));
  }

  const clientId = process.env.NOTION_CLIENT_ID!;
  const clientSecret = process.env.NOTION_CLIENT_SECRET!;
  const redirectUri = process.env.NOTION_REDIRECT_URI!;

  // Parse state to get projectId
  let projectId = "";
  try {
    const state = JSON.parse(Buffer.from(stateParam ?? "", "base64url").toString());
    projectId = state.projectId;
  } catch { /* ignore */ }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Notion token exchange failed:", err);
      return NextResponse.redirect(new URL("/app/notion?error=token_failed", request.url));
    }

    const tokenData = await tokenRes.json();
    const {
      access_token,
      workspace_id,
      workspace_name,
      owner,
    } = tokenData;

    // Save to Supabase
    const supabase = createAdminClient();

    // Upsert: if connection already exists for this project, update it
    const { error } = await supabase
      .from("notion_connections")
      .upsert(
        {
          project_id: projectId,
          user_id: owner?.user?.id ?? null,
          access_token,
          workspace_id,
          workspace_name: workspace_name ?? "My Workspace",
          synced_pages: [],
          last_synced_at: null,
        },
        { onConflict: "project_id" }
      );

    if (error) {
      console.error("Failed to save Notion connection:", error);
      return NextResponse.redirect(new URL("/app/notion?error=save_failed", request.url));
    }

    return NextResponse.redirect(new URL("/app/notion?connected=true", request.url));
  } catch (err) {
    console.error("Notion callback error:", err);
    return NextResponse.redirect(new URL("/app/notion?error=unknown", request.url));
  }
}
