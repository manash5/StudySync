import { authStorage, type AuthUser } from "./auth";

export interface ApiErrorPayload {
  message?: string;
  detail?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const backendBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const aiBase = process.env.NEXT_PUBLIC_AI_BASE_URL || "http://localhost:8000";

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function normalizeBackendPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/api" || normalizedPath.startsWith("/api/")) {
    return normalizedPath;
  }
  return `/api${normalizedPath}`;
}

async function request<T>(
  base: string,
  path: string,
  init: RequestInit = {},
  withAuth = true,
): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (withAuth) {
    const token = authStorage.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(joinUrl(base, path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (withAuth && response.status === 401) {
      authStorage.clearAll();
    }

    let payload: ApiErrorPayload | null = null;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }
    const message = payload?.message || payload?.detail || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const backendApi = {
  get: <T>(path: string, withAuth = true) =>
    request<T>(backendBase, normalizeBackendPath(path), { method: "GET" }, withAuth),
  post: <T>(path: string, body?: unknown, withAuth = true) =>
    request<T>(
      backendBase,
      normalizeBackendPath(path),
      {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      },
      withAuth,
    ),
  put: <T>(path: string, body?: unknown, withAuth = true) =>
    request<T>(
      backendBase,
      normalizeBackendPath(path),
      {
        method: "PUT",
        body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      },
      withAuth,
    ),
  delete: <T>(path: string, withAuth = true) =>
    request<T>(backendBase, normalizeBackendPath(path), { method: "DELETE" }, withAuth),
};

export const aiApi = {
  post: <T>(path: string, body: FormData | unknown) =>
    request<T>(
      aiBase,
      path,
      {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
      },
      false,
    ),
};

export interface Subject {
  _id: string;
  name: string;
  color: string;
  totalLectures: number;
  completedLectures: number;
  lastStudied?: string;
}

export interface Lecture {
  _id: string;
  subject?: string;
  fileName: string;
  fileSize: string;
  duration: string;
  fileUrl: string;
  type: "upload" | "recording";
  createdAt: string;
}

export interface StudyPlanItem {
  _id: string;
  subject: string;
  topic: string;
  time: string;
  status: "Pending" | "Completed";
  priority: "High" | "Medium" | "Low";
  date: string;
  source?: "manual" | "generated";
  noteId?: string;
}

export interface StudyRetentionItem {
  noteId: string;
  subject: string;
  title: string;
  retentionRate: number;
  nextReviewDays: number;
}

export interface GeneratedStudySession {
  noteId?: string;
  subject: string;
  topic: string;
  day: string;
  start_time: string;
  end_time: string;
  priority: "High" | "Medium" | "Low";
  color?: string;
  retention_rate?: number;
  reason?: string;
}

export interface GeneratedStudyPlanResponse {
  message: string;
  plans: StudyPlanItem[];
  retention: StudyRetentionItem[];
  lowRetentionNotes: StudyRetentionItem[];
}

export interface StudyPlanStats {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
}

export interface RoutineItem {
  _id: string;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
  lecturer?: string;
  code?: string;
  color: string;
  status: "active" | "cancelled" | "paused";
  type: "class" | "study";
  source?: "manual" | "study-plan";
  noteId?: string;
}

export interface NoteItem {
  _id: string;
  subjectId: Subject | string;
  lectureId?: string;
  title: string;
  lectureNumber: string;
  duration: string;
  mainTopic: string;
  prerequisites: string[];
  keyConcepts: { concept: string; score: number }[];
  importantPoints: string[];
  notes: string;
  reviewed: boolean;
  createdAt: string;
  lastReviewedAt?: string | null;
  reviewCount?: number;
}

export interface Settings {
  _id: string;
  emailNotifications: boolean;
  lectureReminders: boolean;
  classReminders: boolean;
  assignmentDue: boolean;
  weeklyDigest: boolean;
  theme: "light" | "dark";
}

export interface AuthResponse extends AuthUser {
  token: string;
}

export interface AiLectureResponse {
  message: string;
  lecturer_speaker_id: string;
  lecturer_duration_seconds: number;
  output_file: string;
  structured_notes_file?: string;
  topic?: string;
  key_concepts?: string[];
  important_points?: string[];
  prerequisites?: string[];
  detailed_explanation?: string;
}

export interface AiRoutineCourse {
  course_code: string;
  course_name: string;
  days: string[];
  start_time: string;
  end_time: string;
  duration_hours: number;
  location?: string;
}

export interface AiRoutineResponse {
  section: string | null;
  total_hours_per_week: number | null;
  courses: AiRoutineCourse[];
}

export function mediaUrl(fileUrl: string): string {
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  const backendRoot = backendBase.endsWith("/api") ? backendBase.slice(0, -4) : backendBase;
  return `${backendRoot}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
}
