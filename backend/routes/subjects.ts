import { Router, Response } from "express";
import Subject from "../models/Subject";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

// @route   GET /api/subjects
// @desc    Get all subjects for user
// @access  Private
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await Subject.find({ userId: req.user?._id });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   POST /api/subjects
// @desc    Create a new subject
// @access  Private
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;

    const subject = await Subject.create({
      userId: req.user?._id,
      name,
      color: color || "#3b82f6",
    });
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   PUT /api/subjects/:id
// @desc    Update a subject
// @access  Private
router.put("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      req.body,
      { new: true }
    );
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   DELETE /api/subjects/:id
// @desc    Delete a subject
// @access  Private
router.delete("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    await Subject.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?._id,
    });
    res.json({ message: "Subject deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;