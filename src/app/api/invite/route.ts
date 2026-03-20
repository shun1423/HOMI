import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, projectId } = await request.json();

    if (!email || !projectId) {
      return NextResponse.json(
        { message: "이메일과 프로젝트 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find user by email
    const { data: userList, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json(
        { message: "사용자 조회 실패" },
        { status: 500 }
      );
    }

    const targetUser = userList.users.find((u) => u.email === email);

    if (!targetUser) {
      return NextResponse.json(
        { message: "해당 이메일로 가입된 사용자가 없습니다. 먼저 회원가입이 필요합니다." },
        { status: 404 }
      );
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", targetUser.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: "이미 이 집의 멤버입니다" },
        { status: 409 }
      );
    }

    // Add as member
    const { error: insertError } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: targetUser.id,
        role: "member",
      });

    if (insertError) {
      return NextResponse.json(
        { message: "멤버 추가 실패: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "초대 성공",
      user: { name: targetUser.user_metadata?.name ?? email, email },
    });
  } catch {
    return NextResponse.json(
      { message: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
