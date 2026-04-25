import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// Models
import User from "./models/User";
import Subject from "./models/Subject";
import Note from "./models/Note";
import Lecture from "./models/Lecture";
import StudyPlan from "./models/StudyPlan";
import Routine from "./models/Routine";
import Settings from "./models/Settings";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/studysync";

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Subject.deleteMany({});
    await Note.deleteMany({});
    await Lecture.deleteMany({});
    await StudyPlan.deleteMany({});
    await Routine.deleteMany({});
    await Settings.deleteMany({});
    console.log("Cleared existing data");

    // Create Users
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const user1 = await User.create({
      name: "Prashant Tamang",
      email: "prashant@example.com",
      password: hashedPassword,
      phone: "+977 9800123456",
      university: "Softwarica College",
      department: "Computer Science Engineering",
      streak: 7,
      totalStudyTime: 145,
    });

    const user2 = await User.create({
      name: "Aayush Sharma",
      email: "aayush@example.com",
      password: hashedPassword,
      university: "Softwarica College",
      department: "Computer Science Engineering",
      streak: 3,
      totalStudyTime: 90,
    });

    console.log("Created users:", user1.email, user2.email);

    // Create Settings for users
    await Settings.create({ userId: user1._id });
    await Settings.create({ userId: user2._id });
    console.log("Created settings");

    // Create Subjects
    const subjects = await Subject.insertMany([
      {
        userId: user1._id,
        name: "Machine Learning",
        color: "#3b82f6",
        totalLectures: 8,
        completedLectures: 6,
        lastStudied: new Date(),
      },
      {
        userId: user1._id,
        name: "Linear Algebra",
        color: "#8b5cf6",
        totalLectures: 6,
        completedLectures: 4,
        lastStudied: new Date(Date.now() - 86400000),
      },
      {
        userId: user1._id,
        name: "Neural Networks",
        color: "#06b6d4",
        totalLectures: 5,
        completedLectures: 2,
        lastStudied: new Date(Date.now() - 3 * 86400000),
      },
      {
        userId: user1._id,
        name: "Probability Theory",
        color: "#10b981",
        totalLectures: 7,
        completedLectures: 5,
        lastStudied: new Date(Date.now() - 7 * 86400000),
      },
    ]);

    console.log("Created subjects:", subjects.length);

    // Create Notes
    const notes = await Note.insertMany([
      {
        userId: user1._id,
        subjectId: subjects[0]._id,
        title: "Introduction to ML",
        lectureNumber: "Lecture 1",
        duration: "90 min",
        mainTopic: "What is Machine Learning and its types",
        prerequisites: ["Basic Statistics", "Linear Algebra", "Python Programming"],
        keyConcepts: [
          { concept: "Supervised Learning", score: 0.92 },
          { concept: "Unsupervised Learning", score: 0.88 },
          { concept: "Reinforcement Learning", score: 0.76 },
          { concept: "Training vs Testing", score: 0.71 },
        ],
        importantPoints: [
          "ML is about learning patterns from data without being explicitly programmed",
          "Overfitting occurs when model learns noise in training data",
          "Cross-validation is key to evaluating generalization",
        ],
        notes: "Machine learning is a subfield of AI that gives systems the ability to learn and improve from experience. The three main types are supervised (labeled data), unsupervised (unlabeled), and reinforcement learning (reward-based).",
        reviewed: true,
      },
      {
        userId: user1._id,
        subjectId: subjects[0]._id,
        title: "Linear Regression",
        lectureNumber: "Lecture 2",
        duration: "90 min",
        mainTopic: "Linear regression and cost functions",
        prerequisites: ["Calculus (derivatives)", "Statistics", "Lecture 1"],
        keyConcepts: [
          { concept: "Hypothesis Function", score: 0.95 },
          { concept: "Cost Function (MSE)", score: 0.91 },
          { concept: "Gradient Descent", score: 0.89 },
          { concept: "Learning Rate", score: 0.82 },
        ],
        importantPoints: [
          "Cost function J(θ) measures how wrong predictions are",
          "Gradient descent minimizes cost by updating parameters",
          "Learning rate α controls step size",
        ],
        notes: "Linear regression fits a line y = θ₀ + θ₁x to data. We minimize the MSE cost function using gradient descent.",
        reviewed: false,
      },
      {
        userId: user1._id,
        subjectId: subjects[1]._id,
        title: "Vectors & Vector Spaces",
        lectureNumber: "Lecture 1",
        duration: "60 min",
        mainTopic: "Vectors, operations and vector spaces",
        prerequisites: ["High school math"],
        keyConcepts: [
          { concept: "Vector Addition", score: 0.90 },
          { concept: "Scalar Multiplication", score: 0.88 },
          { concept: "Dot Product", score: 0.85 },
          { concept: "Linear Independence", score: 0.80 },
        ],
        importantPoints: [
          "Vectors represent magnitude and direction in n-dimensional space",
          "Linear independence: no vector can be written as combination of others",
          "Basis vectors span the entire vector space",
        ],
        notes: "A vector space V must satisfy 8 axioms including closure under addition and scalar multiplication.",
        reviewed: true,
      },
      {
        userId: user1._id,
        subjectId: subjects[2]._id,
        title: "Perceptrons & Neurons",
        lectureNumber: "Lecture 1",
        duration: "90 min",
        mainTopic: "Biological inspiration and artificial neurons",
        prerequisites: ["Linear Algebra", "Calculus", "Machine Learning basics"],
        keyConcepts: [
          { concept: "Artificial Neuron", score: 0.93 },
          { concept: "Weights & Biases", score: 0.89 },
          { concept: "Activation Functions", score: 0.88 },
          { concept: "Perceptron Learning Rule", score: 0.80 },
        ],
        importantPoints: [
          "Output: f(Σwᵢxᵢ + b) where f is the activation function",
          "ReLU is most popular — avoids vanishing gradient",
          "Universal approximation theorem",
        ],
        notes: "A neuron computes a weighted sum of inputs plus bias, then applies an activation function.",
        reviewed: false,
      },
    ]);

    console.log("Created notes:", notes.length);

    // Create Lectures
    const lectures = await Lecture.insertMany([
      {
        userId: user1._id,
        subject: "Web API Development",
        fileName: "Lecture_01_APIs.mp3",
        fileSize: "45.2 MB",
        duration: "1:23:45",
        fileUrl: "/uploads/lecture_01.mp3",
        type: "upload",
      },
      {
        userId: user1._id,
        subject: "Mobile Development",
        fileName: "Class_Recording_04-25.mp3",
        fileSize: "52.8 MB",
        duration: "1:45:20",
        fileUrl: "/uploads/recording_0425.mp3",
        type: "recording",
      },
    ]);

    console.log("Created lectures:", lectures.length);

    // Create Study Plans
    const studyPlans = await StudyPlan.insertMany([
      {
        userId: user1._id,
        subject: "Machine Learning",
        topic: "Gradient Descent",
        time: "14:00 - 15:30",
        status: "Pending",
        priority: "High",
        date: new Date(),
      },
      {
        userId: user1._id,
        subject: "Linear Algebra",
        topic: "Vectors & Vector Spaces",
        time: "16:00 - 17:00",
        status: "Pending",
        priority: "Medium",
        date: new Date(),
      },
      {
        userId: user1._id,
        subject: "Neural Networks",
        topic: "Perceptrons & Neurons",
        time: "19:00 - 20:30",
        status: "Pending",
        priority: "High",
        date: new Date(),
      },
    ]);

    console.log("Created study plans:", studyPlans.length);

    // Create Routine
    const routines = await Routine.insertMany([
      {
        userId: user1._id,
        subject: "Web API Development",
        day: "Monday",
        startTime: "09:00",
        endTime: "11:00",
        room: "Block E - SL-6",
        lecturer: "ST6003CEM",
        code: "ST6003CEM",
        color: "#10b981",
        status: "active",
        type: "class",
      },
      {
        userId: user1._id,
        subject: "Mobile Application Development",
        day: "Monday",
        startTime: "11:00",
        endTime: "13:00",
        room: "Block E - SL-6",
        lecturer: "ST6002CEM",
        code: "ST6002CEM",
        color: "#10b981",
        status: "active",
        type: "class",
      },
      {
        userId: user1._id,
        subject: "Design Thinking",
        day: "Tuesday",
        startTime: "09:00",
        endTime: "11:00",
        room: "Seminar Hall",
        lecturer: "STA309IAE",
        code: "STA309IAE",
        color: "#10b981",
        status: "active",
        type: "class",
      },
      {
        userId: user1._id,
        subject: "Web API Development",
        day: "Wednesday",
        startTime: "09:00",
        endTime: "11:00",
        room: "Block E - SL-6",
        lecturer: "ST6003CEM",
        code: "ST6003CEM",
        color: "#10b981",
        status: "active",
        type: "class",
      },
      {
        userId: user1._id,
        subject: "Mobile Application Development",
        day: "Wednesday",
        startTime: "11:00",
        endTime: "13:00",
        room: "Block E - SL-6",
        lecturer: "ST6002CEM",
        code: "ST6002CEM",
        color: "#10b981",
        status: "active",
        type: "class",
      },
      {
        userId: user1._id,
        subject: "ML Review",
        day: "Monday",
        startTime: "14:00",
        endTime: "16:00",
        room: "Library",
        lecturer: "Self",
        color: "#ef4444",
        status: "active",
        type: "study",
      },
      {
        userId: user1._id,
        subject: "Math Practice",
        day: "Tuesday",
        startTime: "11:00",
        endTime: "13:00",
        room: "Dorm",
        lecturer: "Self",
        color: "#ef4444",
        status: "active",
        type: "study",
      },
    ]);

    console.log("Created routines:", routines.length);

    console.log("\n✅ Seed data created successfully!");
    console.log("\n📧 Test Credentials:");
    console.log("   Email: prashant@example.com");
    console.log("   Password: password123");
    console.log("\n   Email: aayush@example.com");
    console.log("   Password: password123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();