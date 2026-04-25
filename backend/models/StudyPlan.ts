import mongoose, { Document, Schema } from "mongoose";

export interface IStudyPlan extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  topic: string;
  time: string;
  status: "Pending" | "Completed";
  priority: "High" | "Medium" | "Low";
  date: Date;
  createdAt: Date;
}

const studyPlanSchema = new Schema<IStudyPlan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

studyPlanSchema.index({ userId: 1, date: 1 });

export default mongoose.model<IStudyPlan>("StudyPlan", studyPlanSchema);