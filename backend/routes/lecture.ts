import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";
import { mkdirSync } from "fs";
import Lecture from "../models/Lecture";
import Note from "../models/Note";
import Subject from "../models/Subject";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

interface AiLecturePayload {
  topic?: string;
  lecturer_duration_seconds?: number;
  key_concepts?: string[];
  important_points?: string[];
  prerequisites?: string[];
  detailed_explanation?: string;
}

// Multer storage for audio files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), "uploads");
    mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024,
    fields: 20,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/|video\//;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only audio files are allowed"));
  },
});

// @route   GET /api/lectures
// @desc    Get all lectures
// @access  Private
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const lectures = await Lecture.find({ userId: req.user?._id }).sort({
      uploadedAt: -1,
    });
    res.json(lectures);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   POST /api/lectures
// @desc    Upload lecture audio
// @access  Private
router.post(
  "/",
  protect,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { subject, type, duration, subjectId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let aiPayload: AiLecturePayload | null = null;
      if (typeof req.body.aiResult === "string" && req.body.aiResult.trim()) {
        try {
          aiPayload = JSON.parse(req.body.aiResult) as AiLecturePayload;
        } catch {
          return res.status(400).json({ message: "Invalid aiResult payload" });
        }
      } else if (req.body.aiResult && typeof req.body.aiResult === "object") {
        aiPayload = req.body.aiResult as AiLecturePayload;
      }

      const lecture = await Lecture.create({
        userId: req.user?._id,
        subject,
        fileName: file.originalname,
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        fileUrl: `/uploads/${file.filename}`,
        duration: typeof duration === "string" && duration.trim() ? duration.trim() : "00:00:00",
        type: type === "recording" ? "recording" : "upload",
      });

      if (aiPayload) {
        let resolvedSubjectId =
          typeof subjectId === "string" && subjectId.trim() ? subjectId.trim() : "";

        if (resolvedSubjectId && !mongoose.Types.ObjectId.isValid(resolvedSubjectId)) {
          resolvedSubjectId = "";
        }

        if (!resolvedSubjectId && typeof subject === "string" && subject.trim()) {
          const subjectName = subject.trim();
          const escapedSubject = subjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          let subjectDoc = await Subject.findOne({
            userId: req.user?._id,
            name: { $regex: `^${escapedSubject}$`, $options: "i" },
          });

          if (!subjectDoc) {
            subjectDoc = await Subject.create({
              userId: req.user?._id,
              name: subjectName,
              color: "#3b82f6",
            });
          }

          resolvedSubjectId = String(subjectDoc._id);
        }

        if (!resolvedSubjectId) {
          return res.status(400).json({ message: "Subject is required to save generated notes" });
        }

        await Note.create({
          userId: req.user?._id,
          subjectId: resolvedSubjectId,
          lectureId: lecture._id,
          title: aiPayload.topic || lecture.fileName,
          lectureNumber: `Lecture ${new Date().toLocaleDateString()}`,
          duration: `${Math.max(1, Math.round(aiPayload.lecturer_duration_seconds || 0))} sec`,
          mainTopic: aiPayload.topic || (typeof subject === "string" ? subject : "Untitled Subject"),
          prerequisites: aiPayload.prerequisites || [],
          keyConcepts: (aiPayload.key_concepts || []).map((concept) => ({ concept, score: 0.8 })),
          importantPoints: aiPayload.important_points || [],
          notes: aiPayload.detailed_explanation || "No detailed explanation provided by AI.",
        });

        await Subject.findOneAndUpdate(
          { _id: resolvedSubjectId, userId: req.user?._id },
          {
            $inc: { totalLectures: 1, completedLectures: 1 },
            $set: { lastStudied: new Date() },
          },
        );
      }

      res.status(201).json(lecture);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Server error";
      res.status(500).json({ message, detail: "Lecture upload failed in backend route." });
    }
  }
);

// @route   PUT /api/lectures/:id
// @desc    Update lecture (rename)
// @access  Private
router.put("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, subject } = req.body;
    const lecture = await Lecture.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      { fileName, subject },
      { new: true }
    );
    res.json(lecture);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   DELETE /api/lectures/:id
// @desc    Delete lecture
// @access  Private
router.delete("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    await Lecture.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?._id,
    });
    res.json({ message: "Lecture deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;