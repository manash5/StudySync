import { Router, Response } from "express";
import StudyPlan from "../models/StudyPlan";
import Note from "../models/Note";
import Routine from "../models/Routine";
import Subject from "../models/Subject";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

type StudyPlanGeneratorNote = {
  id: string;
  subjectId: string;
  subject: string;
  title: string;
  mainTopic: string;
  createdAt: string;
  reviewed: boolean;
  lastReviewedAt?: string | null;
  reviewCount: number;
  retentionRate?: number;
};

type StudyPlanGeneratorRoutine = {
  id: string;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  type: "class" | "study";
  color: string;
  status: "active" | "cancelled" | "paused";
};

type GeneratedStudySession = {
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
};

type GeneratedStudyPlanResponse = {
  sessions?: GeneratedStudySession[];
  study_sessions?: GeneratedStudySession[];
  low_retention_notes?: Array<{
    noteId?: string;
    subject: string;
    title: string;
    retentionRate: number;
  }>;
  retention_by_note?: Array<{
    noteId?: string;
    subject: string;
    title: string;
    retentionRate: number;
    nextReviewDays?: number;
  }>;
};

function getAiServiceBase(): string {
  return process.env.AI_SERVICE_URL || "http://localhost:8000";
}

function parseTimeToMinutes(value: string): number {
  const trimmed = value.trim();
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    let hour = Number(amPmMatch[1]);
    const minute = Number(amPmMatch[2]);
    const period = amPmMatch[3].toUpperCase();
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    return Number(twentyFourHourMatch[1]) * 60 + Number(twentyFourHourMatch[2]);
  }

  return 9 * 60;
}

function minutesToTime(value: number): string {
  const safeMinutes = Math.max(0, value);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function dayIndex(day: string): number {
  const order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return order.indexOf(day);
}

function nextOccurrence(day: string, time: string): Date {
  const target = new Date();
  const targetIndex = dayIndex(day);
  const currentIndex = target.getDay();
  const dayDelta = (targetIndex - currentIndex + 7) % 7;
  target.setDate(target.getDate() + dayDelta);
  const [hours, minutes] = time.split(":").map(Number);
  target.setHours(hours, minutes, 0, 0);
  return target;
}

function computeRetentionScore(note: StudyPlanGeneratorNote): number {
  const now = Date.now();
  const reference = note.lastReviewedAt ? new Date(note.lastReviewedAt).getTime() : new Date(note.createdAt).getTime();
  const ageDays = Math.max((now - reference) / (1000 * 60 * 60 * 24), 0);
  const decay = Math.exp(-ageDays / 14);
  const reviewBoost = Math.min((note.reviewCount || 0) * 0.08, 0.24);
  const reviewedBoost = note.reviewed ? 0.08 : 0;
  const score = 26 + decay * 56 + reviewBoost * 100 + reviewedBoost * 100;
  return Math.max(5, Math.min(100, Math.round(score)));
}

function buildNotePayload(notes: Array<any>): StudyPlanGeneratorNote[] {
  return notes.map((note) => {
    const subject = typeof note.subjectId === "object" && note.subjectId?.name ? note.subjectId.name : "General";
    const subjectId = String(typeof note.subjectId === "object" ? note.subjectId?._id || note.subjectId : note.subjectId);
    const createdAt = note.createdAt instanceof Date ? note.createdAt.toISOString() : String(note.createdAt);
    const lastReviewedAt = note.lastReviewedAt ? new Date(note.lastReviewedAt).toISOString() : null;
    const retentionRate = computeRetentionScore({
      id: String(note._id),
      subjectId,
      subject,
      title: note.title,
      mainTopic: note.mainTopic,
      createdAt,
      reviewed: Boolean(note.reviewed),
      lastReviewedAt,
      reviewCount: Number(note.reviewCount || 0),
    });

    return {
      id: String(note._id),
      subjectId,
      subject,
      title: note.title,
      mainTopic: note.mainTopic,
      createdAt,
      reviewed: Boolean(note.reviewed),
      lastReviewedAt,
      reviewCount: Number(note.reviewCount || 0),
      retentionRate,
    };
  });
}

async function generateStudyPlanWithAi(notes: StudyPlanGeneratorNote[], routines: StudyPlanGeneratorRoutine[]) {
  const response = await fetch(`${getAiServiceBase()}/study-plan/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notes,
      routines,
      study_window_start: "10:00",
      study_window_end: "21:00",
      minimum_retention_threshold: 50,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.detail || payload?.message || `AI study-plan request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as GeneratedStudyPlanResponse;
}

// @route   GET /api/study-plan
// @desc    Get today's study plan
// @access  Private
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const plans = await StudyPlan.find({
      userId: req.user?._id,
      date: { $gte: today, $lt: tomorrow },
    }).sort({ createdAt: 1 });

    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   POST /api/study-plan
// @desc    Create study plan
// @access  Private
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await StudyPlan.create({
      ...req.body,
      userId: req.user?._id,
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   PUT /api/study-plan/:id
// @desc    Toggle task completion
// @access  Private
router.put("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await StudyPlan.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (plan) {
      plan.status = plan.status === "Completed" ? "Pending" : "Completed";
      await plan.save();
    }

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   GET /api/study-plan/stats
// @desc    Get study stats
// @access  Private
router.get("/stats", protect, async (req: AuthRequest, res: Response) => {
  try {
    const total = await StudyPlan.countDocuments({ userId: req.user?._id });
    const completed = await StudyPlan.countDocuments({
      userId: req.user?._id,
      status: "Completed",
    });

    res.json({
      total,
      completed,
      pending: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   POST /api/study-plan/generate
// @desc    Generate study plan from notes and routine data
// @access  Private
router.post("/generate", protect, async (req: AuthRequest, res: Response) => {
  try {
    const [notes, routines, subjects] = await Promise.all([
      Note.find({ userId: req.user?._id }).populate("subjectId", "name color").sort({ createdAt: -1 }),
      Routine.find({ userId: req.user?._id }).sort({ day: 1, startTime: 1 }),
      Subject.find({ userId: req.user?._id }),
    ]);

    const subjectColorMap = new Map(subjects.map((subject) => [subject.name.trim().toLowerCase(), subject.color || "#3b82f6"]));

    const notePayload = buildNotePayload(notes);
    const routinePayload: StudyPlanGeneratorRoutine[] = routines.map((routine) => ({
      id: String(routine._id),
      subject: routine.subject,
      day: routine.day,
      startTime: routine.startTime,
      endTime: routine.endTime,
      type: routine.type,
      color: routine.color || subjectColorMap.get(routine.subject.trim().toLowerCase()) || "#10b981",
      status: routine.status,
    }));

    const aiResponse = await generateStudyPlanWithAi(notePayload, routinePayload);
    const sessions = aiResponse.sessions || aiResponse.study_sessions || [];

    await Promise.all([
      StudyPlan.deleteMany({ userId: req.user?._id, source: "generated" }),
      Routine.deleteMany({ userId: req.user?._id, type: "study", source: "study-plan" }),
    ]);

    const createdPlans = await Promise.all(
      sessions.map(async (session) => {
        const sessionDate = nextOccurrence(session.day, session.start_time);
        const createdPlan = await StudyPlan.create({
          userId: req.user?._id,
          subject: session.subject,
          topic: session.topic,
          time: `${session.day} ${session.start_time} - ${session.end_time}`,
          status: "Pending",
          priority: session.priority,
          date: sessionDate,
          source: "generated",
          noteId: session.noteId,
        });

        await Routine.create({
          userId: req.user?._id,
          subject: session.subject,
          day: session.day,
          startTime: session.start_time,
          endTime: session.end_time,
          color: session.color || "#f59e0b",
          status: "active",
          type: "study",
          source: "study-plan",
          noteId: session.noteId,
        });

        return createdPlan;
      }),
    );

    res.json({
      message: "Study plan generated successfully",
      plans: createdPlans,
      retention: aiResponse.retention_by_note || [],
      lowRetentionNotes: aiResponse.low_retention_notes || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate study plan";
    res.status(500).json({ message, detail: "Study plan generation failed" });
  }
});

export default router;