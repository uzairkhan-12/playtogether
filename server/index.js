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
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase JSON limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Increase URL encoded limit

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
      message: 'File too large. Maximum size allowed is 200MB.',
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

  // Handle Cloudinary 413 errors
  if (error.http_code === 413) {
    return res.status(413).json({
      success: false,
      message: 'File too large for upload service. Please use a video smaller than 200MB.',
      error: 'UPLOAD_SERVICE_LIMIT'
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

// Increase server timeout for large file uploads
server.timeout = 10 * 60 * 1000; // 10 minutes
server.keepAliveTimeout = 5 * 60 * 1000; // 5 minutes  
server.headersTimeout = 6 * 60 * 1000; // 6 minutes

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

const PORT = process.env.PORT || 8888;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
