import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./db";
import userRoutes from "./routes/userRoutes";
import pieceRoutes from "./routes/pieceRoutes";
import outfitRoutes from "./routes/outfitRoutes";
import shelfRoutes from "./routes/shelfRoutes";
import logRoutes from "./routes/logRoutes";
import authRoutes from "./routes/authRoutes";

const app = express();
const port = process.env.PORT || 4005;

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Backend routers
app.use("/api/users", userRoutes);
app.use("/api/pieces", pieceRoutes);
app.use("/api/outfits", outfitRoutes);
app.use("/api/shelves", shelfRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);

// Create HTTP server for socket.io
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*", // adjust for production
    methods: ["GET", "POST"],
  },
});

// Start server after DB connection
async function startServer() {
  try {
    await connectDB();
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
