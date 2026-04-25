import { Router, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import { protect, AuthRequest } from "../middleware/auth";
import Note from "../models/Note";
import Subject from "../models/Subject";
import StudyPlan from "../models/StudyPlan";
import Routine from "../models/Routine";

const router = Router();

// Helper to run Python script and get result
const runPythonScript = (
  scriptPath: string,
  args: string[]
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python", [scriptPath, ...args]);
    
    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(error || `Script exited with code ${code}`));
      }
    });

    pythonProcess.on("error", (err) => {
      reject(err);
    });
  });
};

// @route   POST /api/ai/process-lecture
// @desc    Process lecture audio and generate structured notes
// @access  Private
router.post(
  "/process-lecture",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const { lectureId, subjectId, audioPath } = req.body;

      const aiScriptPath = path.join(
        __dirname,
        "../../ai-services/main.py"
      );

      const result = await runPythonScript(aiScriptPath, [
        "--process-lecture",
        audioPath || "",
      ]);

      const parsed = JSON.parse(result);

      // Create note from AI result
      const note = await Note.create({
        userId: req.user?._id,
        subjectId,
        lectureId,
        ...parsed,
      });

      // Update subject stats
      await Subject.findByIdAndUpdate(subjectId, {
        $inc: { totalLectures: 1, completedLectures: 1 },
        lastStudied: new Date(),
      });

      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ message: "AI processing failed", error });
    }
  }
);

// @route   POST /api/ai/generate-study-plan
// @desc    Generate AI-optimized study plan
// @access  Private
router.post(
  "/generate-study-plan",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const { focusAreas, availableHours } = req.body;

      const aiScriptPath = path.join(
        __dirname,
        "../../ai-services/main.py"
      );

      const result = await runPythonScript(aiScriptPath, [
        "--generate-study-plan",
        JSON.stringify({ focusAreas, availableHours }),
      ]);

      const plans = JSON.parse(result);

      // Save study plans
      const createdPlans = await StudyPlan.insertMany(
        plans.map((p: any) => ({
          ...p,
          userId: req.user?._id,
          date: new Date(),
        }))
      );

      res.json({
        message: "Study plan generated successfully",
        plans: createdPlans,
      });
    } catch (error) {
      res.status(500).json({ message: "AI plan generation failed", error });
    }
  }
);

// @route   POST /api/ai/analyze-routine
// @desc    Analyze routine from uploaded image
// @access  Private
router.post(
  "/analyze-routine",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const { imagePath } = req.body;

      const aiScriptPath = path.join(
        __dirname,
        "../../ai-services/main.py"
      );

      const result = await runPythonScript(aiScriptPath, [
        "--analyze-routine",
        imagePath || "",
      ]);

      const detectedClasses = JSON.parse(result);

      // Create routine entries
      const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];
      const createdRoutines = [];

      for (let i = 0; i < detectedClasses.length; i++) {
        const cls = detectedClasses[i];
        const routine = await Routine.create({
          userId: req.user?._id,
          subject: cls.subject,
          day: cls.day,
          startTime: cls.startTime,
          endTime: cls.endTime,
          room: cls.room,
          color: colors[i % colors.length],
          status: "active",
          type: "class",
        });
        createdRoutines.push(routine);
      }

      res.json({
        message: "Routine analyzed successfully",
        imported: createdRoutines.length,
        routines: createdRoutines,
      });
    } catch (error) {
      res.status(500).json({ message: "Routine analysis failed", error });
    }
  }
);

// @route   GET /api/ai/insights
// @desc    Get AI-powered learning insights
// @access  Private
router.get(
  "/insights",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const aiScriptPath = path.join(
        __dirname,
        "../../ai-services/main.py"
      );

      const result = await runPythonScript(aiScriptPath, [
        "--get-insights",
        req.user?._id.toString() || "",
      ]);

      const insights = JSON.parse(result);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to get insights", error });
    }
  }
);

// @route   POST /api/ai/generate-notes
// @desc    Generate notes from text input
// @access  Private
router.post(
  "/generate-notes",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const { subjectId, content } = req.body;

      const aiScriptPath = path.join(
        __dirname,
        "../../ai-services/main.py"
      );

      const result = await runPythonScript(aiScriptPath, [
        "--generate-notes",
        content,
      ]);

      const parsed = JSON.parse(result);

      const note = await Note.create({
        userId: req.user?._id,
        subjectId,
        ...parsed,
        reviewed: false,
      });

      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ message: "Note generation failed", error });
    }
  }
);

export default router;