import jwt from "jsonwebtoken";

export const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET || "dev-only-jwt-secret-change-me";

  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }

  return jwt.sign({ id }, secret, {
    expiresIn: "30d",
  });
};