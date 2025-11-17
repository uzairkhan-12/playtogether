import express from "express";
import {
  uploadVideo,
  getVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  playVideo,
  upload,
  uploadProgressLogger
} from "../controllers/videoController.js";
import { protect, restrictTo, requirePairing } from "../utils/authMiddleware.js";

const router = express.Router();

// All routes require authentication  
router.use(protect);

// Video upload (Parents only) - Enhanced for large files up to 300MB
router.post("/upload", 
  restrictTo("parent"),
  uploadProgressLogger, // Log upload progress and timing
  (req, res, next) => {
    console.log('🔄 Processing file upload with enhanced multer configuration...');
    upload.single("video")(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err.message);
        
        // Enhanced multer error handling
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: 'File too large! Maximum size allowed is 300MB.',
            errorCode: 'FILE_TOO_LARGE',
            maxSize: '100MB',
            suggestion: 'Please compress your video to under 100MB'
          });
        }
        
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Only video files are allowed.',
            errorCode: 'INVALID_FILE_TYPE'
          });
        }
        
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
          errorCode: 'UPLOAD_ERROR'
        });
      }
      console.log('✅ File processed by multer successfully');
      next();
    });
  },
  uploadVideo
);

// Get all videos (Parents see their own, Children see paired parent's videos)
router.get("/", requirePairing, getVideos);

// Get single video
router.get("/:id", requirePairing, getVideo);

// Update video info (Parents only, own videos)
router.put("/:id", restrictTo("parent"), updateVideo);

// Delete video (Parents only, own videos)
router.delete("/:id", restrictTo("parent"), deleteVideo);

// Play video / increment play count
router.post("/:id/play", requirePairing, playVideo);

export default router;