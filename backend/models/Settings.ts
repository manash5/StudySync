import mongoose, { Document, Schema } from "mongoose";

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  emailNotifications: boolean;
  lectureReminders: boolean;
  classReminders: boolean;
  assignmentDue: boolean;
  weeklyDigest: boolean;
  theme: "light" | "dark";
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    emailNotifications: { type: Boolean, default: true },
    lectureReminders: { type: Boolean, default: true },
    classReminders: { type: Boolean, default: true },
    assignmentDue: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: false },
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "dark",
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>("Settings", settingsSchema);