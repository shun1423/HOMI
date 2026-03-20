import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function GET(request: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Notion API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  try {
    const notion = new Client({ auth: apiKey });

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
