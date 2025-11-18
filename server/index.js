import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import { authenticateSocket, handleConnection, getConnectionStats } from "./controllers/socketController.js";

dotenv.config();
connectDB();

const app = express();
// Enhanced CORS for large file uploads
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Content-Length"],
  maxAge: 86400 // 24 hours preflight cache
}));

// Increase payload limits for large video uploads
// Enhanced body parsing for large file uploads - up to 300MB (local storage)
app.use(express.json({ 
  limit: '100mb',
  extended: true,
  parameterLimit: 50000
}));

app.use(express.urlencoded({ 
  limit: '100mb', 
  extended: true,
  parameterLimit: 50000
}));

// Add raw body parser for large file uploads
app.use(express.raw({ type: 'video/*', limit: '300mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
app.get("/", (req, res) => res.send("Video Control Backend Running"));
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);

// Socket.IO connection stats endpoint
app.get("/api/socket/stats", (req, res) => {
  res.json({
    success: true,
    data: getConnectionStats()
  });
});

// Global error handler for multer and other errors
app.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size allowed is 300MB.',
      error: 'FILE_TOO_LARGE'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field. Please use "video" field name.',
      error: 'UNEXPECTED_FILE'
    });
  }

  if (error.message === 'Only video files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only video files are allowed. Supported formats: mp4, mov, avi, mkv, webm',
      error: 'INVALID_FILE_TYPE'
    });
  }

    // Handle 413 payload too large errors
  if (err.status === 413 || err.message?.includes('413')) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large. Maximum file size is 300MB.',
      errorCode: 'PAYLOAD_TOO_LARGE'
    });
  }

  // Generic error handler
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

const server = http.createServer(app);

// Increase server timeout for large file uploads (200MB+)
server.timeout = 20 * 60 * 1000; // 20 minutes for very large files
server.keepAliveTimeout = 10 * 60 * 1000; // 10 minutes keep alive
server.headersTimeout = 12 * 60 * 1000; // 12 minutes headers timeout
server.requestTimeout = 15 * 60 * 1000; // 15 minutes request timeout

// 🔌 Enhanced Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*", // Configure this properly for production
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO middleware for authentication
io.use(authenticateSocket);

// Handle socket connections with video control
io.on("connection", handleConnection(io));

console.log("🔌 Socket.IO server configured with video control events");

import os from 'os';

const PORT = process.env.PORT || 8888;
// Bind to 0.0.0.0 so the server is reachable from other devices on the LAN
server.listen(PORT, '0.0.0.0', () => {
  // Attempt to determine the LAN IP for convenience in logs
  const ifaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
    if (localIp !== 'localhost') break;
  }
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Also accessible locally at: http://localhost:${PORT}`);
});
