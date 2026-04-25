import { Router, Request, Response } from "express";
import User from "../models/User";
import Settings from "../models/Settings";
import { generateToken } from "../utils/generateToken";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });

    // Create default settings
    await Settings.create({ userId: user._id });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      streak: user.streak,
      totalStudyTime: user.totalStudyTime,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        university: user.university,
        department: user.department,
        streak: user.streak,
        totalStudyTime: user.totalStudyTime,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", protect, async (req: AuthRequest, res: Response) => {
  res.json(req.user);
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, university, department } = req.body;

    const user = await User.findById(req.user?._id);
    if (user) {
      user.name = name || user.name;
      user.email = email || user.email;
      user.phone = phone !== undefined ? phone : user.phone;
      user.university = university !== undefined ? university : user.university;
      user.department = department !== undefined ? department : user.department;

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        university: updatedUser.university,
        department: updatedUser.department,
        streak: updatedUser.streak,
        totalStudyTime: updatedUser.totalStudyTime,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put("/password", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    if (user && (await user.matchPassword(currentPassword))) {
      user.password = newPassword;
      await user.save();
      res.json({ message: "Password updated successfully" });
    } else {
      res.status(401).json({ message: "Current password is incorrect" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;