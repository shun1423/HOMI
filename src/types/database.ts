// ---------------------------------------------------------------------------
// Database types matching Supabase tables
// ---------------------------------------------------------------------------

export type BoardItemStatus =
  | "undecided"
  | "has_candidates"
  | "decided"
  | "purchased"
  | "installed";

export type ProjectMemberRole = "owner" | "member";

export type PlaceType = "showroom" | "store" | "contractor" | "other";

export type VisitStatus = "not_visited" | "planned" | "visited";

export type TaskStatus = "todo" | "in_progress" | "done";

export type DocType = "contract" | "estimate" | "warranty" | "receipt" | "other";

export type ChatRole = "user" | "assistant";

export type ChatIntent = "update" | "question" | "notion_analyze" | null;

export type PhotoStage = "before" | "during" | "after";

export type ExpenseCategory = "자재" | "인건비" | "배송비" | string;

// ---------------------------------------------------------------------------
// Table interfaces
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  created_at: string;
}

export type DoorWindowType = "door" | "window";
export type WallSide = "top" | "bottom" | "left" | "right";

export interface Space {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  icon_key: string | null;
  color: string | null;
  sort_order: number;
  floor_x: number | null;
  floor_y: number | null;
  floor_width: number | null;
  floor_height: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BoardItem {
  id: string;
  project_id: string;
  space_id: string;
  category: string;
  status: BoardItemStatus;
  decision_content: string | null;
  notes: string | null;
  estimated_budget: number | null;
  cost_material: number | null;
  cost_labor: number | null;
  cost_delivery: number | null;
  cost_other: number | null;
  spec_width: string | null;
  spec_height: string | null;
  spec_area: string | null;
  spec_quantity: string | null;
  spec_color: string | null;
  spec_model_name: string | null;
  spec_product_code: string | null;
  spec_purchase_url: string | null;
  contractor_id: string | null;
  construction_date: string | null;
  construction_end_date: string | null;
  construction_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DoorWindow {
  id: string;
  space_id: string;
  type: DoorWindowType;
  wall: WallSide;
  position: number;
  width: number;
  created_at: string;
  updated_at: string;
}

export interface BoardItemPhoto {
  id: string;
  board_item_id: string;
  file_url: string;
  thumbnail_url: string | null;
  stage: PhotoStage | null;
  description: string | null;
  taken_at: string | null;
  created_at: string;
}

export interface BoardItemShowroom {
  id: string;
  board_item_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  distance_km: number | null;
  visit_status: VisitStatus;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardItemMemo {
  id: string;
  board_item_id: string;
  content: string;
  user_id: string | null;
  created_at: string;
}

export interface BoardItemHistory {
  id: string;
  board_item_id: string;
  action: string;
  user_id: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  board_item_id: string;
  name: string;
  brand: string | null;
  price: number | null;
  unit_price: number | null;
  price_unit: string | null;
  quantity: number | null;
  spec_details: Record<string, string> | null;
  image_url: string | null;
  pros: string | null;
  cons: string | null;
  rating: number | null;
  purchase_url: string | null;
  notes: string | null;
  is_selected: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CandidatePhoto {
  id: string;
  candidate_id: string;
  file_url: string;
  thumbnail_url: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Place {
  id: string;
  project_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  business_hours: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_from_base: number | null;
  travel_time_minutes: number | null;
  place_type: PlaceType | null;
  category: string | null;
  visit_status: VisitStatus;
  visit_date: string | null;
  visit_notes: string | null;
  rating: number | null;
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  project_id: string;
  title: string;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleStop {
  id: string;
  schedule_id: string;
  place_id: string | null;
  stop_order: number;
  planned_arrival: string | null;
  planned_departure: string | null;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface Contractor {
  id: string;
  project_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  specialty: string[];
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: string;
  contractor_id: string;
  board_item_id: string | null;
  amount: number | null;
  description: string | null;
  file_url: string | null;
  date: string | null;
  created_at: string;
}

export interface ContractorHistory {
  id: string;
  contractor_id: string;
  action: string;
  notes: string | null;
  date: string | null;
  user_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  contractor_id: string | null;
  start_date: string | null;
  end_date: string | null;
  depends_on: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  project_id: string;
  board_item_id: string | null;
  contractor_id: string | null;
  amount: number;
  description: string | null;
  vendor: string | null;
  date: string;
  category: ExpenseCategory | null;
  receipt_url: string | null;
  receipt_ocr_data: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  project_id: string;
  space_id: string | null;
  board_item_id: string | null;
  file_url: string;
  thumbnail_url: string | null;
  stage: PhotoStage | null;
  description: string | null;
  taken_at: string | null;
  created_at: string;
}

export type MoodImageSourceType =
  | "upload"
  | "instagram"
  | "pinterest"
  | "blog"
  | "other";

export interface MoodImage {
  id: string;
  project_id: string;
  space_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  source_url: string | null;
  source_type: MoodImageSourceType;
  tags: string[];
  notes: string | null;
  is_liked: boolean;
  sort_order: number;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  contractor_id: string | null;
  title: string;
  doc_type: DocType;
  file_url: string | null;
  file_size: string | null;
  vendor: string | null;
  date: string | null;
  notes: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string | null;
  role: ChatRole;
  content: string;
  intent: ChatIntent;
  action_taken: Record<string, unknown> | null;
  created_at: string;
}

export type MeetingStatus = "scheduled" | "completed" | "cancelled";

export interface MeetingDecision {
  id: string;
  content: string;
  boardItemId?: string;
  applied?: boolean;
}

export interface MeetingActionItem {
  id: string;
  content: string;
  assignee?: string;
  dueDate?: string;
  taskId?: string;
  done?: boolean;
}

export interface Meeting {
  id: string;
  project_id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  agenda: string | null;
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  zoom_recording_url: string | null;
  transcript: string | null;
  ai_summary: string | null;
  decisions: MeetingDecision[];
  action_items: MeetingActionItem[];
  status: MeetingStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarConnection {
  id: string;
  project_id: string;
  access_token: string;
  refresh_token: string | null;
  calendar_id: string;
  sync_meetings: boolean;
  sync_tasks: boolean;
  sync_schedules: boolean;
  sync_construction: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotionConnection {
  id: string;
  project_id: string;
  user_id: string | null;
  access_token: string;
  workspace_id: string | null;
  workspace_name: string | null;
  synced_pages: Record<string, unknown> | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}
