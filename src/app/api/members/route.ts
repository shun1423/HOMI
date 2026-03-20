import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId 필요" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get project members
  const { data: memberRows, error } = await supabase
    .from("project_members")
    .select("id, user_id, role")
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch user info for each member via admin API
  const members = await Promise.all(
    (memberRows ?? []).map(async (row) => {
      const { data } = await supabase.auth.admin.getUserById(row.user_id);
      return {
        id: row.id,
        user_id: row.user_id,
        role: row.role,
        email: data.user?.email ?? "알 수 없음",
        name:
          data.user?.user_metadata?.name ??
          data.user?.email?.split("@")[0] ??
          "사용자",
      };
    })
  );

  return NextResponse.json({ members });
}
