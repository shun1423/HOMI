import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "네이버 API 키가 설정되지 않았습니다" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=comment`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "네이버 API 요청 실패" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Clean up HTML tags from naver response
    const items = (data.items ?? []).map(
      (item: {
        title: string;
        address: string;
        roadAddress: string;
        telephone: string;
        mapx: string;
        mapy: string;
        category: string;
        link: string;
      }) => ({
        name: item.title.replace(/<[^>]*>/g, ""),
        address: item.roadAddress || item.address,
        phone: item.telephone || null,
        latitude: item.mapy ? Number(item.mapy) / 1e7 : null,
        longitude: item.mapx ? Number(item.mapx) / 1e7 : null,
        category: item.category || null,
        link: item.link || null,
      })
    );

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "검색 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
