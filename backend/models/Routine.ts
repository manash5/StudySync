import mongoose, { Document, Schema } from "mongoose";

export interface IRoutine extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
  lecturer?: string;
  code?: string;
  color: string;
  status: "active" | "cancelled" | "paused";
  type: "class" | "study";
  createdAt: Date;
}

const routineSchema = new Schema<IRoutine>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: { type: String, required: true },
    day: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String },
    lecturer: { type: String },
    code: { type: String },
    color: { type: String, default: "#10b981" },
    status: {
      type: String,
      enum: ["active", "cancelled", "paused"],
      default: "active",
    },
    type: {
      type: String,
      enum: ["class", "study"],
      default: "class",
    },
  },
  { timestamps: true }
);

routineSchema.index({ userId: 1, day: 1 });

export default mongoose.model<IRoutine>("Routine", routineSchema);