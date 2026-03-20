import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId 필요" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: connection } = await supabase
    .from("notion_connections")
    .select("access_token")
    .eq("project_id", projectId)
    .single();

  if (!connection?.access_token) {
    return NextResponse.json({ error: "Notion 연결이 필요합니다" }, { status: 401 });
  }

  try {
    const notion = new Client({ auth: connection.access_token });

    const response = await notion.search({
      filter: { property: "object", value: "page" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 20,
    });

    const pages = response.results.map((page: Record<string, unknown>) => {
      const props = (page as { properties?: Record<string, unknown> }).properties;
      const titleProp = props
        ? Object.values(props).find(
            (p: unknown) => (p as { type?: string }).type === "title"
          )
        : null;
      const titleArr = titleProp
        ? ((titleProp as { title?: { plain_text?: string }[] }).title ?? [])
        : [];
      const title = titleArr.map((t) => t.plain_text ?? "").join("") || "Untitled";

      return {
        id: (page as { id: string }).id,
        title,
        lastEdited: (page as { last_edited_time?: string }).last_edited_time ?? null,
        url: (page as { url?: string }).url ?? null,
      };
    });

    return NextResponse.json({ pages });
  } catch (err) {
    console.error("Notion pages error:", err);
    return NextResponse.json({ error: "페이지 목록 조회 실패" }, { status: 500 });
  }
}
