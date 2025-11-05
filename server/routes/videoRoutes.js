import express from "express";
import {
  uploadVideo,
  getVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  playVideo,
  upload
} from "../controllers/videoController.js";
import { protect, restrictTo, requirePairing } from "../utils/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Video upload (Parents only)
router.post("/upload", 
  restrictTo("parent"),
  (req, res, next) => {
    upload.single("video")(req, res, (err) => {
      if (err) {
        return next(err); // Pass multer errors to error handler
      }
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