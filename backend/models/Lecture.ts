import mongoose, { Document, Schema } from "mongoose";

export interface ILecture extends Document {
  userId: mongoose.Types.ObjectId;
  subject?: string;
  fileName: string;
  fileSize: string;
  duration: string;
  fileUrl: string;
  type: "upload" | "recording";
  uploadedAt: Date;
}

const lectureSchema = new Schema<ILecture>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: { type: String, trim: true },
    fileName: { type: String, required: true },
    fileSize: { type: String, default: "0 MB" },
    duration: { type: String, default: "00:00:00" },
    fileUrl: { type: String, required: true },
    type: {
      type: String,
      enum: ["upload", "recording"],
      default: "upload",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

lectureSchema.index({ userId: 1 });

export default mongoose.model<ILecture>("Lecture", lectureSchema);