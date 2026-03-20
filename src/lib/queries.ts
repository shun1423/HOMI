import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  Project,
  Space,
  BoardItem,
  Candidate,
  CandidatePhoto,
  Contractor,
  ChatMessage,
  DoorWindow,
  BoardItemPhoto,
  BoardItemShowroom,
  BoardItemMemo,
  BoardItemHistory,
  Place,
  Schedule,
  ScheduleStop,
  Estimate,
  ContractorHistory,
  MoodImage,
  MoodImageSourceType,
  Task,
  Expense,
  Photo,
  TaskStatus,
  ExpenseCategory,
  PhotoStage,
  Document,
  DocType,
  NotionConnection,
  Meeting,
  GoogleCalendarConnection,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Dynamic project ID (reads from zustand persisted store)
// ---------------------------------------------------------------------------
const FALLBACK_PROJECT_ID = "a1b2c3d4-0000-0000-0000-000000000001";

function getProjectId(): string {
  if (typeof window === "undefined") return FALLBACK_PROJECT_ID;
  try {
    const stored = localStorage.getItem("homi-store");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.state?.projectId) return parsed.state.projectId;
    }
  } catch {
    // ignore parse errors
  }
  return FALLBACK_PROJECT_ID;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const queryKeys = {
  spaces: ["spaces"] as const,
  boardItems: (spaceId?: string) =>
    spaceId ? (["board-items", spaceId] as const) : (["board-items"] as const),
  candidates: (boardItemId: string) =>
    ["candidates", boardItemId] as const,
  contractors: ["contractors"] as const,
  chatMessages: ["chat-messages"] as const,
  doorWindows: (spaceId?: string) =>
    spaceId
      ? (["door-windows", spaceId] as const)
      : (["door-windows"] as const),
  boardItemPhotos: (boardItemId: string) =>
    ["board-item-photos", boardItemId] as const,
  boardItemShowrooms: (boardItemId: string) =>
    ["board-item-showrooms", boardItemId] as const,
  boardItemMemos: (boardItemId: string) =>
    ["board-item-memos", boardItemId] as const,
  boardItemHistory: (boardItemId: string) =>
    ["board-item-history", boardItemId] as const,
  places: ["places"] as const,
  schedules: ["schedules"] as const,
  scheduleStops: (scheduleId: string) =>
    ["schedule-stops", scheduleId] as const,
  estimates: (contractorId?: string) =>
    contractorId
      ? (["estimates", contractorId] as const)
      : (["estimates"] as const),
  contractorHistory: (contractorId: string) =>
    ["contractor-history", contractorId] as const,
  moodImages: (spaceId?: string) =>
    spaceId
      ? (["mood-images", spaceId] as const)
      : (["mood-images"] as const),
  candidatePhotos: (candidateId: string) =>
    ["candidate-photos", candidateId] as const,
  allCandidates: ["all-candidates"] as const,
  tasks: ["tasks"] as const,
  expenses: ["expenses"] as const,
  projectPhotos: (spaceId?: string) =>
    spaceId
      ? (["project-photos", spaceId] as const)
      : (["project-photos"] as const),
  documents: (docType?: string) =>
    docType
      ? (["documents", docType] as const)
      : (["documents"] as const),
  notionConnection: ["notion-connection"] as const,
  meetings: ["meetings"] as const,
  googleCalendar: ["google-calendar"] as const,
  project: ["project"] as const,
  userProjects: ["user-projects"] as const,
};

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export function useProject() {
  const supabase = createClient();
  return useQuery<Project>({
    queryKey: queryKeys.project,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", getProjectId())
        .single();
      if (error) throw error;
      return data as Project;
    },
  });
}

export function useUpdateProject() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<Project, "id"> &
      Partial<Pick<Project, "name" | "description" | "address">>) => {
      const { data, error } = await supabase
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project });
    },
  });
}

export function useCreateProject() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Project, "name"> &
        Partial<Pick<Project, "description" | "address">>
    ) => {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert(input)
        .select()
        .single();
      if (projectError) throw projectError;

      // Add current user as owner
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error: memberError } = await supabase
          .from("project_members")
          .insert({
            project_id: project.id,
            user_id: user.id,
            role: "owner",
          });
        if (memberError) throw memberError;
      }

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project });
      queryClient.invalidateQueries({ queryKey: queryKeys.userProjects });
    },
  });
}

// ---------------------------------------------------------------------------
// User Projects (all projects the current user belongs to)
// ---------------------------------------------------------------------------

export interface UserProject {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  role: string;
  space_count: number;
  progress: number;
}

export function useUserProjects() {
  const supabase = createClient();
  return useQuery<UserProject[]>({
    queryKey: queryKeys.userProjects,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // Get project memberships
      const { data: members, error: memberError } = await supabase
        .from("project_members")
        .select("project_id, role")
        .eq("user_id", user.id);
      if (memberError) throw memberError;
      if (!members || members.length === 0) return [];

      const projectIds = members.map((m) => m.project_id);

      // Get projects
      const { data: projects, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds);
      if (projectError) throw projectError;

      // Get space counts per project
      const { data: spaces } = await supabase
        .from("spaces")
        .select("id, project_id")
        .in("project_id", projectIds)
        .is("deleted_at", null);

      // Get board items for progress calculation
      const { data: boardItems } = await supabase
        .from("board_items")
        .select("id, status, project_id")
        .in("project_id", projectIds)
        .is("deleted_at", null);

      const statusWeight: Record<string, number> = {
        undecided: 0,
        has_candidates: 25,
        decided: 50,
        purchased: 75,
        installed: 100,
      };

      return (projects ?? []).map((project) => {
        const role = members.find((m) => m.project_id === project.id)?.role ?? "member";
        const projectSpaces = (spaces ?? []).filter((s) => s.project_id === project.id);
        const projectItems = (boardItems ?? []).filter((i) => i.project_id === project.id);
        const progress =
          projectItems.length > 0
            ? Math.round(
                projectItems.reduce((sum, item) => sum + (statusWeight[item.status] ?? 0), 0) /
                  projectItems.length
              )
            : 0;
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          address: project.address,
          created_at: project.created_at,
          updated_at: project.updated_at,
          role,
          space_count: projectSpaces.length,
          progress,
        };
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

export function useSpaces() {
  const supabase = createClient();
  return useQuery<Space[]>({
    queryKey: queryKeys.spaces,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spaces")
        .select("*")
        .eq("project_id", getProjectId())
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSpace() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Space, "name"> &
        Partial<
          Pick<
            Space,
            | "description"
            | "sort_order"
            | "icon_key"
            | "color"
            | "floor_x"
            | "floor_y"
            | "floor_width"
            | "floor_height"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("spaces")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
    },
  });
}

export function useUpdateSpace() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<Space, "id"> &
      Partial<
        Pick<
          Space,
          | "name"
          | "description"
          | "sort_order"
          | "icon_key"
          | "color"
          | "floor_x"
          | "floor_y"
          | "floor_width"
          | "floor_height"
        >
      >) => {
      const { data, error } = await supabase
        .from("spaces")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
    },
  });
}

export function useDeleteSpace() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from("spaces")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
    },
  });
}

// ---------------------------------------------------------------------------
// Board Items
// ---------------------------------------------------------------------------

export function useBoardItems(spaceId?: string) {
  const supabase = createClient();
  return useQuery<BoardItem[]>({
    queryKey: queryKeys.boardItems(spaceId),
    queryFn: async () => {
      let query = supabase
        .from("board_items")
        .select("*")
        .eq("project_id", getProjectId())
        .is("deleted_at", null)
        .order("sort_order")
        .order("created_at");

      if (spaceId) {
        query = query.eq("space_id", spaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBoardItem() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<BoardItem, "space_id" | "category"> &
        Partial<
          Pick<
            BoardItem,
            | "status"
            | "decision_content"
            | "notes"
            | "estimated_budget"
            | "cost_material"
            | "cost_labor"
            | "cost_delivery"
            | "cost_other"
            | "spec_width"
            | "spec_height"
            | "spec_area"
            | "spec_quantity"
            | "spec_color"
            | "spec_model_name"
            | "spec_product_code"
            | "spec_purchase_url"
            | "contractor_id"
            | "construction_date"
            | "construction_end_date"
            | "construction_notes"
            | "sort_order"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("board_items")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardItems(variables.space_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.boardItems() });
    },
  });
}

export function useUpdateBoardItem() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<BoardItem, "id"> &
      Partial<
        Pick<
          BoardItem,
          | "status"
          | "category"
          | "decision_content"
          | "notes"
          | "estimated_budget"
          | "cost_material"
          | "cost_labor"
          | "cost_delivery"
          | "cost_other"
          | "spec_width"
          | "spec_height"
          | "spec_area"
          | "spec_quantity"
          | "spec_color"
          | "spec_model_name"
          | "spec_product_code"
          | "spec_purchase_url"
          | "contractor_id"
          | "construction_date"
          | "construction_end_date"
          | "construction_notes"
          | "sort_order"
        >
      >) => {
      const { data, error } = await supabase
        .from("board_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-items"] });
    },
  });
}

export function useDeleteBoardItem() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("board_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-items"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export function useCandidates(boardItemId: string) {
  const supabase = createClient();
  return useQuery<Candidate[]>({
    queryKey: queryKeys.candidates(boardItemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("board_item_id", boardItemId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!boardItemId,
  });
}

export function useCreateCandidate() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Candidate, "board_item_id" | "name"> &
        Partial<
          Pick<
            Candidate,
            | "brand"
            | "price"
            | "unit_price"
            | "price_unit"
            | "quantity"
            | "spec_details"
            | "pros"
            | "cons"
            | "rating"
            | "purchase_url"
            | "notes"
            | "sort_order"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("candidates")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidates(variables.board_item_id),
      });
    },
  });
}

export function useUpdateCandidate() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      board_item_id,
      ...updates
    }: Pick<Candidate, "id" | "board_item_id"> &
      Partial<
        Pick<
          Candidate,
          | "name"
          | "brand"
          | "price"
          | "unit_price"
          | "price_unit"
          | "quantity"
          | "spec_details"
          | "pros"
          | "cons"
          | "rating"
          | "purchase_url"
          | "notes"
          | "is_selected"
          | "sort_order"
        >
      >) => {
      const { data, error } = await supabase
        .from("candidates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Candidate & { board_item_id: string };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidates(variables.board_item_id),
      });
    },
  });
}

export function useDeleteCandidate() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      boardItemId,
    }: {
      id: string;
      boardItemId: string;
    }) => {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { boardItemId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidates(variables.boardItemId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Candidate Photos
// ---------------------------------------------------------------------------

export function useCandidatePhotos(candidateId: string) {
  const supabase = createClient();
  return useQuery<CandidatePhoto[]>({
    queryKey: queryKeys.candidatePhotos(candidateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_photos")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!candidateId,
  });
}

export function useCreateCandidatePhoto() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<CandidatePhoto, "candidate_id" | "file_url"> &
        Partial<
          Pick<CandidatePhoto, "thumbnail_url" | "description" | "sort_order">
        >
    ) => {
      const { data, error } = await supabase
        .from("candidate_photos")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidatePhotos(variables.candidate_id),
      });
    },
  });
}

export function useDeleteCandidatePhoto() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      candidateId,
    }: {
      id: string;
      candidateId: string;
    }) => {
      const { error } = await supabase
        .from("candidate_photos")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { candidateId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidatePhotos(variables.candidateId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Contractors
// ---------------------------------------------------------------------------

export function useContractors() {
  const supabase = createClient();
  return useQuery<Contractor[]>({
    queryKey: queryKeys.contractors,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("project_id", getProjectId())
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContractor() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Contractor, "name"> &
        Partial<
          Pick<
            Contractor,
            "contact_name" | "phone" | "email" | "specialty" | "rating" | "notes"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("contractors")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors });
    },
  });
}

export function useUpdateContractor() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<Contractor, "id"> &
      Partial<
        Pick<
          Contractor,
          "name" | "contact_name" | "phone" | "email" | "specialty" | "rating" | "notes"
        >
      >) => {
      const { data, error } = await supabase
        .from("contractors")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors });
    },
  });
}

export function useDeleteContractor() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contractors")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors });
    },
  });
}

// ---------------------------------------------------------------------------
// Door / Windows
// ---------------------------------------------------------------------------

export function useDoorWindows() {
  const supabase = createClient();
  return useQuery<DoorWindow[]>({
    queryKey: queryKeys.doorWindows(),
    queryFn: async () => {
      // Join through spaces to filter by project_id
      const { data, error } = await supabase
        .from("door_windows")
        .select("*, spaces!inner(project_id)")
        .eq("spaces.project_id", getProjectId());
      if (error) throw error;
      // Strip the joined spaces object
      return (data ?? []).map(({ spaces: _spaces, ...dw }) => dw as DoorWindow);
    },
  });
}

export function useDoorWindowsBySpace(spaceId: string) {
  const supabase = createClient();
  return useQuery<DoorWindow[]>({
    queryKey: queryKeys.doorWindows(spaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("door_windows")
        .select("*")
        .eq("space_id", spaceId);
      if (error) throw error;
      return data;
    },
    enabled: !!spaceId,
  });
}

export function useCreateDoorWindow() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<DoorWindow, "space_id" | "type" | "wall" | "position" | "width">
    ) => {
      const { data, error } = await supabase
        .from("door_windows")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.doorWindows(variables.space_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.doorWindows() });
    },
  });
}

export function useUpdateDoorWindow() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<DoorWindow, "id"> &
      Partial<Pick<DoorWindow, "wall" | "position" | "width">>) => {
      const { data, error } = await supabase
        .from("door_windows")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["door-windows"] });
    },
  });
}

export function useDeleteDoorWindow() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("door_windows")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["door-windows"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Board Item Photos
// ---------------------------------------------------------------------------

export function useBoardItemPhotos(boardItemId: string) {
  const supabase = createClient();
  return useQuery<BoardItemPhoto[]>({
    queryKey: queryKeys.boardItemPhotos(boardItemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_item_photos")
        .select("*")
        .eq("board_item_id", boardItemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!boardItemId,
  });
}

// ---------------------------------------------------------------------------
// Board Item Showrooms
// ---------------------------------------------------------------------------

export function useBoardItemShowrooms(boardItemId: string) {
  const supabase = createClient();
  return useQuery<BoardItemShowroom[]>({
    queryKey: queryKeys.boardItemShowrooms(boardItemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_item_showrooms")
        .select("*")
        .eq("board_item_id", boardItemId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!boardItemId,
  });
}

// ---------------------------------------------------------------------------
// Board Item Memos
// ---------------------------------------------------------------------------

export function useBoardItemMemos(boardItemId: string) {
  const supabase = createClient();
  return useQuery<BoardItemMemo[]>({
    queryKey: queryKeys.boardItemMemos(boardItemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_item_memos")
        .select("*")
        .eq("board_item_id", boardItemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!boardItemId,
  });
}

export function useCreateBoardItemMemo() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<BoardItemMemo, "board_item_id" | "content"> &
        Partial<Pick<BoardItemMemo, "user_id">>
    ) => {
      const { data, error } = await supabase
        .from("board_item_memos")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardItemMemos(variables.board_item_id),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Board Item History
// ---------------------------------------------------------------------------

export function useBoardItemHistory(boardItemId: string) {
  const supabase = createClient();
  return useQuery<BoardItemHistory[]>({
    queryKey: queryKeys.boardItemHistory(boardItemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_item_history")
        .select("*")
        .eq("board_item_id", boardItemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!boardItemId,
  });
}

export function useCreateBoardItemHistory() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<BoardItemHistory, "board_item_id" | "action"> &
        Partial<Pick<BoardItemHistory, "user_id">>
    ) => {
      const { data, error } = await supabase
        .from("board_item_history")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardItemHistory(variables.board_item_id),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Chat Messages
// ---------------------------------------------------------------------------

export function useChatMessages() {
  const supabase = createClient();
  return useQuery<ChatMessage[]>({
    queryKey: queryKeys.chatMessages,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("project_id", getProjectId())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateChatMessage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<ChatMessage, "role" | "content"> &
        Partial<Pick<ChatMessage, "user_id" | "intent" | "action_taken">>
    ) => {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages });
    },
  });
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

export function usePlaces() {
  const supabase = createClient();
  return useQuery<Place[]>({
    queryKey: queryKeys.places,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("project_id", getProjectId())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePlace() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Place, "name"> &
        Partial<
          Pick<
            Place,
            | "address"
            | "phone"
            | "business_hours"
            | "website_url"
            | "latitude"
            | "longitude"
            | "distance_from_base"
            | "travel_time_minutes"
            | "place_type"
            | "category"
            | "visit_status"
            | "visit_date"
            | "visit_notes"
            | "rating"
            | "is_bookmarked"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("places")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places });
    },
  });
}

export function useUpdatePlace() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<Place, "id"> &
      Partial<
        Pick<
          Place,
          | "name"
          | "address"
          | "phone"
          | "business_hours"
          | "website_url"
          | "latitude"
          | "longitude"
          | "distance_from_base"
          | "travel_time_minutes"
          | "place_type"
          | "category"
          | "visit_status"
          | "visit_date"
          | "visit_notes"
          | "rating"
          | "is_bookmarked"
        >
      >) => {
      const { data, error } = await supabase
        .from("places")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places });
    },
  });
}

export function useDeletePlace() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("places").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places });
    },
  });
}

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export function useSchedules() {
  const supabase = createClient();
  return useQuery<Schedule[]>({
    queryKey: queryKeys.schedules,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("project_id", getProjectId())
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSchedule() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Schedule, "title" | "date"> &
        Partial<Pick<Schedule, "notes">>
    ) => {
      const { data, error } = await supabase
        .from("schedules")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules });
    },
  });
}

export function useScheduleStops(scheduleId: string) {
  const supabase = createClient();
  return useQuery<(ScheduleStop & { place?: Place })[]>({
    queryKey: queryKeys.scheduleStops(scheduleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_stops")
        .select("*, places(*)")
        .eq("schedule_id", scheduleId)
        .order("stop_order");
      if (error) throw error;
      return (data ?? []).map(({ places, ...stop }) => ({
        ...stop,
        place: places ?? undefined,
      })) as (ScheduleStop & { place?: Place })[];
    },
    enabled: !!scheduleId,
  });
}

export function useCreateScheduleStop() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<ScheduleStop, "schedule_id" | "stop_order"> &
        Partial<Pick<ScheduleStop, "place_id" | "planned_arrival" | "planned_departure" | "notes" | "is_completed">>
    ) => {
      const { data, error } = await supabase
        .from("schedule_stops")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduleStops(variables.schedule_id) });
    },
  });
}

export function useUpdateScheduleStop() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      schedule_id,
      ...updates
    }: Pick<ScheduleStop, "id" | "schedule_id"> &
      Partial<Pick<ScheduleStop, "stop_order" | "planned_arrival" | "planned_departure" | "notes" | "is_completed">>
    ) => {
      const { data, error } = await supabase
        .from("schedule_stops")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, schedule_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduleStops(data.schedule_id) });
    },
  });
}

export function useDeleteScheduleStop() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schedule_id }: { id: string; schedule_id: string }) => {
      const { error } = await supabase.from("schedule_stops").delete().eq("id", id);
      if (error) throw error;
      return { schedule_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduleStops(data.schedule_id) });
    },
  });
}

// ---------------------------------------------------------------------------
// Estimates
// ---------------------------------------------------------------------------

export function useEstimates(contractorId?: string) {
  const supabase = createClient();
  return useQuery<Estimate[]>({
    queryKey: queryKeys.estimates(contractorId),
    queryFn: async () => {
      let query = supabase
        .from("estimates")
        .select("*")
        .order("created_at", { ascending: false });
      if (contractorId) {
        query = query.eq("contractor_id", contractorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEstimate() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Estimate, "contractor_id"> &
        Partial<
          Pick<Estimate, "board_item_id" | "amount" | "description" | "file_url" | "date">
        >
    ) => {
      const { data, error } = await supabase
        .from("estimates")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.estimates(variables.contractor_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates() });
    },
  });
}

// ---------------------------------------------------------------------------
// Contractor History
// ---------------------------------------------------------------------------

export function useContractorHistory(contractorId: string) {
  const supabase = createClient();
  return useQuery<ContractorHistory[]>({
    queryKey: queryKeys.contractorHistory(contractorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_history")
        .select("*")
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contractorId,
  });
}

export function useCreateContractorHistory() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<ContractorHistory, "contractor_id" | "action"> &
        Partial<Pick<ContractorHistory, "notes" | "date" | "user_id">>
    ) => {
      const { data, error } = await supabase
        .from("contractor_history")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contractorHistory(variables.contractor_id),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Mood Images
// ---------------------------------------------------------------------------

export function useMoodImages(spaceId?: string) {
  const supabase = createClient();
  return useQuery<MoodImage[]>({
    queryKey: queryKeys.moodImages(spaceId),
    queryFn: async () => {
      let query = supabase
        .from("mood_images")
        .select("*")
        .eq("project_id", getProjectId())
        .order("sort_order")
        .order("created_at", { ascending: false });

      if (spaceId) {
        query = query.eq("space_id", spaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMoodImage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<MoodImage, "image_url"> &
        Partial<
          Pick<
            MoodImage,
            | "space_id"
            | "thumbnail_url"
            | "source_url"
            | "source_type"
            | "tags"
            | "notes"
            | "is_liked"
            | "sort_order"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("mood_images")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-images"] });
    },
  });
}

export function useUpdateMoodImage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<MoodImage, "id"> &
      Partial<
        Pick<
          MoodImage,
          | "is_liked"
          | "notes"
          | "tags"
          | "sort_order"
          | "space_id"
          | "source_type"
          | "source_url"
          | "image_url"
          | "thumbnail_url"
        >
      >) => {
      const { data, error } = await supabase
        .from("mood_images")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-images"] });
    },
  });
}

export function useDeleteMoodImage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mood_images")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-images"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function useTasks() {
  const supabase = createClient();
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", getProjectId())
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Task, "title"> &
        Partial<
          Pick<
            Task,
            | "description"
            | "status"
            | "assignee_id"
            | "contractor_id"
            | "start_date"
            | "end_date"
            | "depends_on"
            | "parent_task_id"
            | "sort_order"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
}

export function useUpdateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<Task, "id"> &
      Partial<
        Pick<
          Task,
          | "title"
          | "description"
          | "status"
          | "assignee_id"
          | "contractor_id"
          | "start_date"
          | "end_date"
          | "depends_on"
          | "parent_task_id"
          | "sort_order"
        >
      >) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
}

export function useDeleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export function useExpenses() {
  const supabase = createClient();
  return useQuery<Expense[]>({
    queryKey: queryKeys.expenses,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("project_id", getProjectId())
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateExpense() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Expense, "amount" | "date"> &
        Partial<
          Pick<
            Expense,
            | "description"
            | "vendor"
            | "category"
            | "board_item_id"
            | "contractor_id"
            | "receipt_url"
            | "notes"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
    },
  });
}

export function useUpdateExpense() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<Expense, "id"> &
      Partial<
        Pick<
          Expense,
          | "amount"
          | "description"
          | "vendor"
          | "date"
          | "category"
          | "board_item_id"
          | "contractor_id"
          | "notes"
        >
      >) => {
      const { data, error } = await supabase
        .from("expenses")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
    },
  });
}

export function useDeleteExpense() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
    },
  });
}

// ---------------------------------------------------------------------------
// Project Photos
// ---------------------------------------------------------------------------

export function useProjectPhotos(spaceId?: string) {
  const supabase = createClient();
  return useQuery<Photo[]>({
    queryKey: queryKeys.projectPhotos(spaceId),
    queryFn: async () => {
      let query = supabase
        .from("photos")
        .select("*")
        .eq("project_id", getProjectId())
        .order("taken_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (spaceId) {
        query = query.eq("space_id", spaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProjectPhoto() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Photo, "file_url"> &
        Partial<
          Pick<
            Photo,
            | "space_id"
            | "board_item_id"
            | "thumbnail_url"
            | "stage"
            | "description"
            | "taken_at"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("photos")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-photos"] });
    },
  });
}

export function useDeleteProjectPhoto() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-photos"] });
    },
  });
}

// ---------------------------------------------------------------------------
// All Candidates (for comparison view, joined with board_items + spaces)
// ---------------------------------------------------------------------------

export interface CandidateWithContext extends Candidate {
  board_item: Pick<BoardItem, "id" | "category" | "status" | "decision_content" | "space_id">;
  space: Pick<Space, "id" | "name" | "color" | "icon_key">;
}

export function useAllCandidates() {
  const supabase = createClient();
  return useQuery<CandidateWithContext[]>({
    queryKey: queryKeys.allCandidates,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select(
          "*, board_items!inner(id, category, status, decision_content, space_id, project_id, deleted_at, spaces!inner(id, name, color, icon_key))"
        )
        .eq("board_items.project_id", getProjectId())
        .is("board_items.deleted_at", null)
        .order("sort_order");

      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => {
        const boardItem = row.board_items as Record<string, unknown>;
        const space = boardItem.spaces as Record<string, unknown>;
        const { board_items: _bi, ...candidate } = row;
        return {
          ...candidate,
          board_item: {
            id: boardItem.id,
            category: boardItem.category,
            status: boardItem.status,
            decision_content: boardItem.decision_content,
            space_id: boardItem.space_id,
          },
          space: {
            id: space.id,
            name: space.name,
            color: space.color,
            icon_key: space.icon_key,
          },
        } as CandidateWithContext;
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export function useDocuments(docType?: string) {
  const supabase = createClient();
  return useQuery<Document[]>({
    queryKey: queryKeys.documents(docType),
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*")
        .eq("project_id", getProjectId())
        .order("date", { ascending: false, nullsFirst: false });

      if (docType && docType !== "all") {
        query = query.eq("doc_type", docType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDocument() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Pick<Document, "title" | "doc_type"> &
        Partial<Pick<Document, "contractor_id" | "file_url" | "file_size" | "vendor" | "date" | "notes">>
    ) => {
      const { data, error } = await supabase
        .from("documents")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUpdateDocument() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<Document, "id"> &
      Partial<Pick<Document, "title" | "doc_type" | "contractor_id" | "file_url" | "file_size" | "vendor" | "date" | "notes">>
    ) => {
      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Notion Connection
// ---------------------------------------------------------------------------

export function useNotionConnection() {
  const supabase = createClient();
  return useQuery<NotionConnection | null>({
    queryKey: queryKeys.notionConnection,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notion_connections")
        .select("*")
        .eq("project_id", getProjectId())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateNotionConnection() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<NotionConnection, "id"> &
      Partial<Pick<NotionConnection, "workspace_name" | "synced_pages" | "last_synced_at">>
    ) => {
      const { data, error } = await supabase
        .from("notion_connections")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notionConnection });
    },
  });
}

export function useDeleteNotionConnection() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notion_connections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notionConnection });
    },
  });
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export function useMeetings() {
  const supabase = createClient();
  return useQuery<Meeting[]>({
    queryKey: queryKeys.meetings,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("project_id", getProjectId())
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMeeting() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Pick<Meeting, "title" | "date"> &
        Partial<Pick<Meeting, "start_time" | "end_time" | "agenda" | "zoom_join_url" | "status">>
    ) => {
      const { data, error } = await supabase
        .from("meetings")
        .insert({ ...input, project_id: getProjectId() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.meetings }); },
  });
}

export function useUpdateMeeting() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<Meeting, "id"> &
      Partial<Pick<Meeting, "title" | "date" | "start_time" | "end_time" | "agenda" | "zoom_join_url" | "zoom_recording_url" | "transcript" | "ai_summary" | "decisions" | "action_items" | "status">>
    ) => {
      const { data, error } = await supabase
        .from("meetings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.meetings }); },
  });
}

export function useDeleteMeeting() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.meetings }); },
  });
}

// ---------------------------------------------------------------------------
// Google Calendar
// ---------------------------------------------------------------------------

export function useGoogleCalendarConnection() {
  const supabase = createClient();
  return useQuery<GoogleCalendarConnection | null>({
    queryKey: queryKeys.googleCalendar,
    queryFn: async () => {
      const { data } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("project_id", getProjectId())
        .maybeSingle();
      return data;
    },
  });
}

export function useUpdateGoogleCalendarSync() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { id: string } & Partial<Pick<GoogleCalendarConnection, "sync_meetings" | "sync_tasks" | "sync_schedules" | "sync_construction" | "last_synced_at">>
    ) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("google_calendar_connections")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendar }); },
  });
}

export function useDeleteGoogleCalendarConnection() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("google_calendar_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendar }); },
  });
}
