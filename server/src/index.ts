// server/src/index.ts
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import app from "./app";

const port = process.env.PORT || 4005;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // adjust for local dev as you want
    methods: ["GET", "POST"],
  },
});

// Example socket handler
io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);
  // your events here
});

async function startServer() {
  try {
    server.listen(port, () => {
      console.log(`Dev server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
