import { Router, Response } from "express";
import Routine from "../models/Routine";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

// @route   GET /api/routine
// @desc    Get weekly routine
// @access  Private
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const routines = await Routine.find({ userId: req.user?._id }).sort({
      startTime: 1,
    });
    res.json(routines);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   POST /api/routine
// @desc    Add routine item
// @access  Private
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const routine = await Routine.create({
      ...req.body,
      userId: req.user?._id,
    });
    res.status(201).json(routine);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   PUT /api/routine/:id
// @desc    Update routine
// @access  Private
router.put("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const routine = await Routine.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      req.body,
      { new: true }
    );
    res.json(routine);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   DELETE /api/routine/:id
// @desc    Delete routine
// @access  Private
router.delete("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    await Routine.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?._id,
    });
    res.json({ message: "Routine deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;