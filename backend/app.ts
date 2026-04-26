
import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { mkdirSync } from "fs";
import connectDB from "./config/database";
import { protect, AuthRequest } from "./middleware/auth";

// Routes
import authroutes from "./routes/auth";
import subjectRoutes from "./routes/subjects";
import noteRoutes from "./routes/notes";
import lectureRoutes from "./routes/lecture";
import studyPlanRoutes from "./routes/studyPlan";
import routineRoutes from "./routes/routine";
import settingsRoutes from "./routes/settings";
import aiRoutes from "./routes/ai";

dotenv.config();
connectDB();

const app: Application = express();
const uploadsDir = path.resolve(process.cwd(), "uploads");
mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/uploads", express.static(uploadsDir));

// Routes
app.use("/api/auth", authroutes);
app.use("/api/subjects", protect, subjectRoutes);
app.use("/api/notes", protect, noteRoutes);
app.use("/api/lectures", protect, lectureRoutes);
app.use("/api/study-plan", protect, studyPlanRoutes);
app.use("/api/routine", protect, routineRoutes);
app.use("/api/settings", protect, settingsRoutes);
app.use("/api/ai", protect, aiRoutes);

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});