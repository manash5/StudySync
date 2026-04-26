import mongoose, { Document, Schema } from "mongoose";

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  lectureId?: mongoose.Types.ObjectId;
  title: string;
  lectureNumber: string;
  duration: string;
  mainTopic: string;
  prerequisites: string[];
  keyConcepts: { concept: string; score: number }[];
  importantPoints: string[];
  notes: string;
  reviewed: boolean;
  lastReviewedAt?: Date;
  reviewCount: number;
  createdAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    lectureId: { type: Schema.Types.ObjectId, ref: "Lecture" },
    title: { type: String, required: true },
    lectureNumber: { type: String, required: true },
    duration: { type: String, default: "60 min" },
    mainTopic: { type: String, required: true },
    prerequisites: [{ type: String }],
    keyConcepts: [{ concept: { type: String }, score: { type: Number } }],
    importantPoints: [{ type: String }],
    notes: { type: String, required: true },
    reviewed: { type: Boolean, default: false },
    lastReviewedAt: { type: Date },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, subjectId: 1 });

export default mongoose.model<INote>("Note", noteSchema);