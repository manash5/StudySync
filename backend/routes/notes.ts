import { Router, Response } from "express";
import Note from "../models/Note";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

// @route   GET /api/notes
// @desc    Get all notes or by subject
// @access  Private
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.query;
    const query: any = { userId: req.user?._id };
    if (subjectId) query.subjectId = subjectId;

    const notes = await Note.find(query)
      .populate("subjectId", "name color")
      .sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   GET /api/notes/:id
// @desc    Get single note
// @access  Private
router.get("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    }).populate("subjectId", "name color");
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   POST /api/notes
// @desc    Create a new note
// @access  Private
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const note = await Note.create({
      ...req.body,
      userId: req.user?._id,
    });
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update note (mark reviewed)
// @access  Private
router.put("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      req.body,
      { new: true }
    );
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete note
// @access  Private
router.delete("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?._id,
    });
    res.json({ message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;