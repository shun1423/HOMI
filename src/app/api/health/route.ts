import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Try a simple query to check connection
    const { data, error } = await supabase
      .from("_dummy_check")
      .select("*")
      .limit(1);

    // PGRST205 or 42P01 = table does not exist (expected, DB is empty)
    // This means connection itself is working
    if (error && (error.code === "42P01" || error.code === "PGRST205")) {
      return NextResponse.json({
        status: "connected",
        message: "Supabase 연결 성공. DB 테이블은 아직 없음.",
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      });
    }

    if (error) {
      return NextResponse.json(
        { status: "error", message: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "connected",
      message: "Supabase 연결 성공",
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: String(e) },
      { status: 500 }
    );
  }
}
