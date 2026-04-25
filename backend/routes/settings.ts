import { Router, Response } from "express";
import Settings from "../models/Settings";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

// @route   GET /api/settings
// @desc    Get user settings
// @access  Private
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    let settings = await Settings.findOne({ userId: req.user?._id });
    if (!settings) {
      settings = await Settings.create({ userId: req.user?._id });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   PUT /api/settings
// @desc    Update settings
// @access  Private
router.put("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { userId: req.user?._id },
      req.body,
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;