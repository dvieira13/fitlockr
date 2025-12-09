// server/src/app.ts
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

import express from "express";
import cors from "cors";

import connectDB from "./db";
import userRoutes from "./routes/userRoutes";
import pieceRoutes from "./routes/pieceRoutes";
import outfitRoutes from "./routes/outfitRoutes";
import shelfRoutes from "./routes/shelfRoutes";
import logRoutes from "./routes/logRoutes";
import authRoutes from "./routes/authRoutes";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Ensure DB connection (once per cold start)
let dbConnected = false;
async function ensureDb() {
    if (!dbConnected) {
        await connectDB();
        dbConnected = true;
    }
}

// Wrap all requests with DB ensure
app.use(async (req, res, next) => {
    try {
        await ensureDb();
        next();
    } catch (err) {
        console.error("DB connection error:", err);
        res.status(500).json({ message: "DB connection failed" });
    }
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/pieces", pieceRoutes);
app.use("/api/outfits", outfitRoutes);
app.use("/api/shelves", shelfRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

export default app;
