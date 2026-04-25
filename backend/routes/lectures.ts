import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import Lecture from "../models/Lecture";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

// Multer storage for audio files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
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
      const { subject } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const lecture = await Lecture.create({
        userId: req.user?._id,
        subject,
        fileName: file.originalname,
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        fileUrl: `/uploads/${file.filename}`,
        type: "upload",
      });

      res.status(201).json(lecture);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
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