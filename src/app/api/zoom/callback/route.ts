import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/app/meetings?error=no_code", request.url));
  }

  const clientId = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;
  const redirectUri = process.env.ZOOM_REDIRECT_URI!;

  let projectId = "";
  try {
    const state = JSON.parse(Buffer.from(stateParam ?? "", "base64url").toString());
    projectId = state.projectId;
  } catch { /* ignore */ }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Zoom token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/app/meetings?error=token_failed", request.url));
    }

    const tokens = await tokenRes.json();

    // Get user info
    const userRes = await fetch("https://api.zoom.us/v2/users/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userData = userRes.ok ? await userRes.json() : null;

    // Save to Supabase
    const supabase = createAdminClient();
    await supabase.from("zoom_connections").upsert(
      {
        project_id: projectId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        user_id: userData?.id ?? null,
        user_email: userData?.email ?? null,
        user_name: userData?.first_name ? `${userData.first_name} ${userData.last_name ?? ""}`.trim() : null,
      },
      { onConflict: "project_id" }
    );

    return NextResponse.redirect(new URL("/app/meetings?zoom_connected=true", request.url));
  } catch (err) {
    console.error("Zoom callback error:", err);
    return NextResponse.redirect(new URL("/app/meetings?error=unknown", request.url));
  }
}
