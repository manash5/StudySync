import mongoose, { Document, Schema } from "mongoose";

export interface ISubject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  totalLectures: number;
  completedLectures: number;
  lastStudied?: Date;
  createdAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "#3b82f6" },
    totalLectures: { type: Number, default: 0 },
    completedLectures: { type: Number, default: 0 },
    lastStudied: { type: Date },
  },
  { timestamps: true }
);

subjectSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<ISubject>("Subject", subjectSchema);