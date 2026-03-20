export type Status =
  | "undecided"
  | "has_candidates"
  | "decided"
  | "purchased"
  | "installed";

export interface Photo {
  id: string;
  url: string;
  stage: "reference" | "before" | "during" | "after";
  description?: string;
  date?: string;
}

export interface Showroom {
  id: string;
  name: string;
  address: string;
  phone?: string;
  distanceKm?: number;
  visitStatus: "not_visited" | "planned" | "visited";
  rating?: number;
  notes?: string;
}

export interface Candidate {
  id: string;
  name: string;
  brand?: string;
  price?: number;
  imageUrl?: string;
  pros?: string;
  cons?: string;
  rating?: number; // 1-5
  purchaseUrl?: string;
  isSelected: boolean;
}

export interface CostBreakdown {
  material?: number;
  labor?: number;
  delivery?: number;
  other?: number;
}

export interface Contractor {
  id: string;
  name: string;
  phone?: string;
  specialty?: string;
  rating?: number;
}

export interface HistoryEntry {
  id: string;
  date: string;
  action: string;
  user: "성훈" | "태수";
}

export interface MaterialSpec {
  width?: string;
  height?: string;
  area?: string;
  quantity?: string;
  color?: string;
  modelName?: string;
  productCode?: string;
  purchaseUrl?: string;
}

export interface Memo {
  id: string;
  content: string;
  date: string;
  user: "성훈" | "태수";
}

export interface BoardItem {
  id: string;
  category: string;
  status: Status;
  decision?: string;
  budget?: number;
  actual?: number;
  candidateCount?: number;
  costBreakdown?: CostBreakdown;
  spec?: MaterialSpec;
  photos?: Photo[];
  showrooms?: Showroom[];
  candidates?: Candidate[];
  contractor?: Contractor;
  constructionDate?: string;
  constructionEndDate?: string;
  constructionNotes?: string;
  memos?: Memo[];
  history?: HistoryEntry[];
}

export interface DoorWindow {
  id: string;
  type: "door" | "window";
  roomId: string;
  wall: "top" | "bottom" | "left" | "right";
  position: number;
  width: number;
}

export interface Room {
  id: string;
  name: string;
  iconKey: RoomIconKey;
  color: string;
  items: BoardItem[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RoomIconKey =
  | "bathroom"
  | "living"
  | "bedroom"
  | "kitchen"
  | "entrance"
  | "storage"
  | "study"
  | "balcony";

export const MOCK_ROOMS: Room[] = [
  {
    id: "bathroom",
    name: "화장실",
    iconKey: "bathroom",
    color: "#6BA3BE",
    items: [
      {
        id: "b1",
        category: "바닥",
        status: "decided",
        decision: "마이크로 시멘트",
        budget: 2000000,
        actual: 1750000,
        costBreakdown: { material: 1200000, labor: 500000, delivery: 50000 },
        spec: {
          width: "3.2m",
          height: "2.4m",
          area: "7.68㎡",
          color: "그레이 톤",
          modelName: "MC-201",
          productCode: "MCG-201-GR",
          purchaseUrl: "https://example.com/mc201",
        },
        photos: [
          { id: "p1", url: "/placeholder.jpg", stage: "reference", description: "참고 이미지 - 핀터레스트" },
          { id: "p2", url: "/placeholder.jpg", stage: "before", description: "시공 전 상태", date: "2026-03-05" },
          { id: "p3", url: "/placeholder.jpg", stage: "after", description: "시공 완료", date: "2026-03-18" },
        ],
        showrooms: [
          {
            id: "s1",
            name: "OO타일 쇼룸",
            address: "경기도 이천시 xx로 123",
            phone: "031-123-4567",
            distanceKm: 38,
            visitStatus: "visited",
            rating: 4,
            notes: "직원 친절, 샘플 다양",
          },
        ],
        candidates: [
          {
            id: "c1",
            name: "A사 마이크로시멘트",
            brand: "A사",
            price: 1200000,
            pros: "색감 자연스러움, 내구성 좋음",
            cons: "가격 높음",
            rating: 4,
            isSelected: true,
          },
          {
            id: "c2",
            name: "B사 마이크로시멘트",
            brand: "B사",
            price: 950000,
            pros: "가격 저렴",
            cons: "색상 선택 적음",
            rating: 3,
            isSelected: false,
          },
        ],
        contractor: { id: "ct1", name: "△△건설", phone: "010-1234-5678", specialty: "타일/시멘트", rating: 4 },
        constructionDate: "2026-04-10",
        constructionEndDate: "2026-04-12",
        constructionNotes: "방수 처리 먼저 해야 함. 건조 기간 최소 3일.",
        memos: [
          { id: "mm1", content: "방수 처리 업자한테 별도 확인 필요", date: "2026-03-10", user: "성훈" },
          { id: "mm2", content: "그레이 톤 중에서도 좀 더 따뜻한 쪽으로", date: "2026-03-12", user: "태수" },
        ],
        history: [
          { id: "h1", date: "2026-03-05", action: "항목 생성", user: "성훈" },
          { id: "h2", date: "2026-03-10", action: "후보 2개 추가", user: "성훈" },
          { id: "h3", date: "2026-03-15", action: "A사 마이크로시멘트로 결정", user: "태수" },
          { id: "h4", date: "2026-03-20", action: "구매 완료", user: "성훈" },
        ],
      },
      {
        id: "b2",
        category: "벽",
        status: "has_candidates",
        candidateCount: 3,
        budget: 1500000,
        spec: { width: "벽 둘레 8.4m", height: "2.4m", area: "20.16㎡" },
        candidates: [
          { id: "c3", name: "화이트 타일 300×600", brand: "XX세라믹", price: 800000, rating: 4, pros: "깔끔", cons: "무난", isSelected: false },
          { id: "c4", name: "그레이 대리석 타일", brand: "YY스톤", price: 1200000, rating: 5, pros: "고급스러움", cons: "비쌈", isSelected: false },
          { id: "c5", name: "방수 페인트", brand: "ZZ페인트", price: 400000, rating: 3, pros: "저렴", cons: "내구성 불안", isSelected: false },
        ],
        showrooms: [
          { id: "s2", name: "XX세라믹 쇼룸", address: "경기도 여주시 yy로 456", phone: "031-456-7890", distanceKm: 45, visitStatus: "planned", rating: undefined },
        ],
        memos: [
          { id: "mm3", content: "바닥이랑 톤 맞춰야 함", date: "2026-03-11", user: "태수" },
        ],
        history: [
          { id: "h5", date: "2026-03-08", action: "항목 생성", user: "성훈" },
          { id: "h6", date: "2026-03-12", action: "후보 3개 추가", user: "태수" },
        ],
      },
      {
        id: "b3",
        category: "세면대",
        status: "decided",
        decision: "분청 도자기",
        budget: 800000,
        actual: 500000,
        costBreakdown: { material: 450000, delivery: 50000 },
        spec: { width: "60cm", height: "45cm", color: "분청 유약", modelName: "분청 라운드볼", productCode: "BC-RD-01" },
        photos: [
          { id: "p4", url: "/placeholder.jpg", stage: "reference", description: "분청 세면대 레퍼런스" },
        ],
        showrooms: [
          { id: "s3", name: "OO 도자기 공방", address: "경기도 이천시 zz로 789", phone: "031-789-0123", distanceKm: 38, visitStatus: "visited", rating: 5, notes: "작가 직접 제작, 2주 소요" },
        ],
        candidates: [
          { id: "c6", name: "분청 라운드볼", brand: "OO공방", price: 450000, rating: 5, pros: "한옥 분위기 완벽", cons: "제작 기간 2주", isSelected: true },
          { id: "c7", name: "백자 각볼", brand: "PP도자기", price: 350000, rating: 3, pros: "깔끔", cons: "한옥 느낌 부족", isSelected: false },
        ],
        memos: [
          { id: "mm4", content: "3월 말까지 주문해야 4월에 받을 수 있음", date: "2026-03-08", user: "성훈" },
        ],
        history: [
          { id: "h7", date: "2026-03-05", action: "항목 생성", user: "성훈" },
          { id: "h8", date: "2026-03-08", action: "이천 공방 방문", user: "태수" },
          { id: "h9", date: "2026-03-10", action: "분청 라운드볼로 결정", user: "성훈" },
        ],
      },
      {
        id: "b4",
        category: "수전",
        status: "purchased",
        decision: "무광 블랙",
        budget: 300000,
        actual: 280000,
        costBreakdown: { material: 250000, delivery: 30000 },
        spec: { color: "무광 블랙", modelName: "BK-MONO-500", productCode: "BKM500", purchaseUrl: "https://example.com/bk500" },
        history: [
          { id: "h10", date: "2026-03-12", action: "온라인 구매 완료", user: "성훈" },
        ],
      },
      {
        id: "b5",
        category: "조명",
        status: "undecided",
        budget: 200000,
        memos: [
          { id: "mm5", content: "습기에 강한 등급으로 골라야 함 (IP44 이상)", date: "2026-03-14", user: "성훈" },
        ],
        history: [
          { id: "h11", date: "2026-03-14", action: "항목 생성", user: "성훈" },
        ],
      },
    ],
    x: 20,
    y: 20,
    width: 160,
    height: 150,
  },
  {
    id: "living",
    name: "거실",
    iconKey: "living",
    color: "#8B9E6B",
    items: [
      { id: "l1", category: "바닥", status: "has_candidates", candidateCount: 2, budget: 5000000, spec: { area: "28㎡" },
        candidates: [
          { id: "c8", name: "원목 마루", brand: "AA마루", price: 3500000, rating: 4, pros: "따뜻한 느낌", cons: "관리 필요", isSelected: false },
          { id: "c9", name: "대리석 타일", brand: "BB스톤", price: 4200000, rating: 4, pros: "고급스러움", cons: "차가움", isSelected: false },
        ],
      },
      { id: "l2", category: "벽", status: "decided", decision: "한지 벽지", budget: 2000000, actual: 1800000, costBreakdown: { material: 1200000, labor: 600000 }, spec: { area: "45㎡", color: "내추럴 아이보리" } },
      { id: "l3", category: "천장", status: "undecided", budget: 1000000 },
      { id: "l4", category: "조명", status: "has_candidates", candidateCount: 3, budget: 1500000,
        candidates: [
          { id: "c10", name: "한지 펜던트", brand: "CC조명", price: 800000, rating: 5, pros: "한옥 분위기", cons: "밝기 부족", isSelected: false },
          { id: "c11", name: "매입 다운라이트", brand: "DD조명", price: 600000, rating: 4, pros: "깔끔", cons: "분위기 부족", isSelected: false },
          { id: "c12", name: "간접 조명 + 펜던트 조합", brand: "CC+DD", price: 1200000, rating: 5, pros: "분위기+밝기 둘 다", cons: "비쌈", isSelected: false },
        ],
      },
    ],
    x: 200,
    y: 20,
    width: 240,
    height: 200,
  },
  {
    id: "bedroom",
    name: "안방",
    iconKey: "bedroom",
    color: "#C4956A",
    items: [
      { id: "m1", category: "바닥", status: "undecided", budget: 3000000 },
      { id: "m2", category: "벽", status: "undecided", budget: 1500000 },
      { id: "m3", category: "천장", status: "undecided", budget: 800000 },
      { id: "m4", category: "조명", status: "undecided", budget: 500000 },
      { id: "m5", category: "붙박이장", status: "undecided", budget: 2000000 },
    ],
    x: 200,
    y: 240,
    width: 240,
    height: 170,
  },
  {
    id: "kitchen",
    name: "부엌",
    iconKey: "kitchen",
    color: "#D4A574",
    items: [
      { id: "k1", category: "바닥", status: "decided", decision: "포세린 타일", budget: 3000000, actual: 2800000, costBreakdown: { material: 2000000, labor: 700000, delivery: 100000 }, spec: { area: "12㎡", color: "베이지", modelName: "PT-600B" } },
      { id: "k2", category: "벽", status: "decided", decision: "서브웨이 타일", budget: 2000000, actual: 1900000, costBreakdown: { material: 1300000, labor: 600000 }, spec: { area: "8㎡", color: "화이트", modelName: "SW-100W" } },
      { id: "k3", category: "싱크대", status: "has_candidates", candidateCount: 2, budget: 5000000,
        candidates: [
          { id: "c13", name: "스테인리스 언더마운트", brand: "EE주방", price: 3500000, rating: 4, pros: "위생적", cons: "스크래치", isSelected: false },
          { id: "c14", name: "인조대리석 일체형", brand: "FF주방", price: 4500000, rating: 5, pros: "깔끔, 이음새 없음", cons: "비쌈", isSelected: false },
        ],
      },
      { id: "k4", category: "조명", status: "installed", decision: "매입등 + 펜던트", budget: 800000, actual: 750000, costBreakdown: { material: 500000, labor: 250000 } },
    ],
    x: 20,
    y: 190,
    width: 160,
    height: 220,
  },
  {
    id: "entrance",
    name: "현관",
    iconKey: "entrance",
    color: "#9B8B7A",
    items: [
      { id: "e1", category: "바닥", status: "decided", decision: "현무암", budget: 1000000, actual: 950000, costBreakdown: { material: 700000, labor: 200000, delivery: 50000 } },
      { id: "e2", category: "신발장", status: "has_candidates", candidateCount: 2, budget: 1500000 },
      { id: "e3", category: "조명", status: "undecided", budget: 300000 },
    ],
    x: 460,
    y: 20,
    width: 120,
    height: 120,
  },
];

export const MOCK_DOORS_WINDOWS: DoorWindow[] = [
  { id: "d1", type: "door", roomId: "bathroom", wall: "right", position: 0.5, width: 30 },
  { id: "d2", type: "door", roomId: "living", wall: "bottom", position: 0.3, width: 35 },
  { id: "d3", type: "door", roomId: "kitchen", wall: "right", position: 0.15, width: 30 },
  { id: "d4", type: "door", roomId: "entrance", wall: "bottom", position: 0.5, width: 35 },
  { id: "w1", type: "window", roomId: "living", wall: "top", position: 0.5, width: 50 },
  { id: "w2", type: "window", roomId: "living", wall: "right", position: 0.4, width: 45 },
  { id: "w3", type: "window", roomId: "bedroom", wall: "bottom", position: 0.5, width: 50 },
  { id: "w4", type: "window", roomId: "kitchen", wall: "left", position: 0.5, width: 35 },
];

export function getProgress(items: BoardItem[]): number {
  if (items.length === 0) return 0;
  const weights: Record<Status, number> = {
    undecided: 0,
    has_candidates: 25,
    decided: 50,
    purchased: 75,
    installed: 100,
  };
  const total = items.reduce((sum, item) => sum + weights[item.status], 0);
  return Math.round(total / items.length);
}

export function getTotalCost(item: BoardItem): number {
  if (!item.costBreakdown) return item.actual || 0;
  const cb = item.costBreakdown;
  return (cb.material || 0) + (cb.labor || 0) + (cb.delivery || 0) + (cb.other || 0);
}

export const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; bg: string }
> = {
  undecided: { label: "미결정", color: "text-muted-foreground", bg: "bg-muted" },
  has_candidates: { label: "후보있음", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  decided: { label: "결정됨", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  purchased: { label: "구매완료", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  installed: { label: "시공완료", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
};
