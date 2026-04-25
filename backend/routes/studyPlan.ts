import { Router, Response } from "express";
import StudyPlan from "../models/StudyPlan";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

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

export default router;