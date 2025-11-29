import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./db";
import eventRoutes from "./routes/eventRoutes";
import userProfileRoutes from "./routes/userProfileRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import logRoutes from "./routes/logRoutes";

dotenv.config();

const app = express();
const port = process.env.PORT || 4005;

app.use(cors());
app.use(express.json());

// Backend routers
app.use("/api/events", eventRoutes);
app.use("/api/users", userProfileRoutes);
app.use("/api/transactions", transactionRoutes);
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

// In-memory chat history for the global confirmation chatroom
const chatHistory: { user: string; message: string; time: string }[] = [];

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join a room
  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    // Send existing chat history to the client
    socket.emit("chatHistory", chatHistory);
  });

  // Receive new message
  socket.on("sendMessage", ({ roomId, user, message }: { roomId: string; user: string; message: string }) => {
    const msg = { user, message, time: new Date().toISOString() };
    chatHistory.push(msg); // store in memory

    // Broadcast to all users in the room
    io.to(roomId).emit("receiveMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
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
