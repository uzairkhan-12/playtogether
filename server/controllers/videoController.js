import cloudinary from "../config/cloudinary.js";
import Video from "../Models/Video.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "playtogether-videos", // Cloudinary folder name
    resource_type: "video", // Specify that we're uploading videos
    allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"], // Allowed video formats
    transformation: [
      { quality: "auto" }, // Auto quality optimization
      { fetch_format: "auto" } // Auto format optimization
    ],
    // Add chunk size for large files
    chunk_size: 6000000, // 6MB chunks for large file uploads
    eager: [
      { quality: "auto:good" }, // Generate optimized version
    ],
    eager_async: true // Process transformations asynchronously
  }
});

// Multer configuration
export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Increased to 500MB for better reliability
    fieldNameSize: 255,
    fieldSize: 2 * 1024 * 1024, // 2MB for text fields
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('video/')) {
      console.log(`Uploading video: ${file.originalname}, Type: ${file.mimetype}`);
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

// @desc    Upload a video
// @route   POST /api/videos/upload
// @access  Private (Parent only)
export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No video file provided"
      });
    }

    const { title, description } = req.body;

    if (!title) {
      // Delete uploaded file from Cloudinary if validation fails
      try {
        const publicIdToDelete = req.file.filename;
        await cloudinary.uploader.destroy(publicIdToDelete, { resource_type: "video" });
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
      return res.status(400).json({
        success: false,
        message: "Video title is required"
      });
    }

    console.log("File uploaded to Cloudinary:", {
      filename: req.file.filename,
      url: req.file.path,
      size: req.file.size,
      originalname: req.file.originalname
    });

    // Extract public_id from filename (format: "playtogether-videos/fygbarhwcz8rxvhvijoi")
    const publicId = req.file.filename;

    // Get video metadata from Cloudinary response
    const videoData = {
      title,
      description: description || "",
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: publicId,
      duration: 0, // Will be updated later when Cloudinary processes the video
      fileSize: req.file.size || 0,
      format: req.file.originalname.split('.').pop().toLowerCase() || "mp4",
      uploadedBy: req.user.id
    };

    // Save video info to database
    const video = await Video.create(videoData);

    // Optionally, get more detailed video info from Cloudinary
    try {
      const cloudinaryDetails = await cloudinary.api.resource(publicId, { resource_type: "video" });
      if (cloudinaryDetails.duration) {
        video.duration = cloudinaryDetails.duration;
        await video.save();
      }
    } catch (detailError) {
      console.log("Could not fetch video details from Cloudinary:", detailError.message);
      // This is not critical, continue without duration
    }

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      data: { video }
    });

  } catch (error) {
    console.error("Upload video error:", error);
    
    // Handle connection reset errors
    if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        message: "Upload was interrupted. Please try again with a stable connection.",
        error: "CONNECTION_RESET"
      });
    }
    
    // Handle specific Cloudinary errors
    if (error.http_code === 413) {
      return res.status(413).json({
        success: false,
        message: "File too large for Cloudinary. Please use a video smaller than 500MB or compress your video.",
        error: "FILE_TOO_LARGE_FOR_CLOUDINARY"
      });
    }

    if (error.name === 'UnexpectedResponse') {
      return res.status(500).json({
        success: false,
        message: "Video upload service error. Please try again or use a smaller file.",
        error: "CLOUDINARY_UPLOAD_ERROR"
      });
    }
    
    // Clean up: Delete file from Cloudinary if database save fails
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: "video" });
        console.log("Cleaned up failed upload from Cloudinary");
      } catch (cleanupError) {
        console.error("Error cleaning up Cloudinary file:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Server error during video upload",
      error: error.message
    });
  }
};

// @desc    Get all videos for a user
// @route   GET /api/videos
// @access  Private
export const getVideos = async (req, res) => {
  try {
    let query = {};

    // If user is a parent, show their uploaded videos
    // If user is a child, show videos from their paired parent
    if (req.user.role === "parent") {
      query.uploadedBy = req.user.id;
    } else if (req.user.role === "child" && req.user.pairedWith) {
      query.uploadedBy = req.user.pairedWith;
    } else {
      return res.status(403).json({
        success: false,
        message: "Child must be paired with a parent to view videos"
      });
    }

    // Add active filter
    query.isActive = true;

    const videos = await Video.find(query)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: videos.length,
      data: { videos }
    });

  } catch (error) {
    console.error("Get videos error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting videos",
      error: error.message
    });
  }
};

// @desc    Get single video by ID
// @route   GET /api/videos/:id
// @access  Private
export const getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate("uploadedBy", "name email");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Check authorization
    if (req.user.role === "parent" && video.uploadedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (req.user.role === "child" && (!req.user.pairedWith || 
        video.uploadedBy._id.toString() !== req.user.pairedWith.toString())) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.status(200).json({
      success: true,
      data: { video }
    });

  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting video",
      error: error.message
    });
  }
};

// @desc    Update video info
// @route   PUT /api/videos/:id
// @access  Private (Parent only - own videos)
export const updateVideo = async (req, res) => {
  try {
    const { title, description } = req.body;

    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Check if user owns the video
    if (video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own videos"
      });
    }

    // Update fields
    if (title) video.title = title;
    if (description !== undefined) video.description = description;

    await video.save();

    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      data: { video }
    });

  } catch (error) {
    console.error("Update video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating video",
      error: error.message
    });
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
// @access  Private (Parent only - own videos)
export const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Check if user owns the video
    if (video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own videos"
      });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: "video" });
    } catch (cloudinaryError) {
      console.error("Error deleting from Cloudinary:", cloudinaryError);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    // Delete from database
    await Video.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Video deleted successfully"
    });

  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting video",
      error: error.message
    });
  }
};

// @desc    Increment video play count
// @route   POST /api/videos/:id/play
// @access  Private
export const playVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Check authorization (same as getVideo)
    if (req.user.role === "parent" && video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (req.user.role === "child" && (!req.user.pairedWith || 
        video.uploadedBy.toString() !== req.user.pairedWith.toString())) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Increment play count
    await video.incrementPlayCount();

    res.status(200).json({
      success: true,
      message: "Play count updated",
      data: { 
        playCount: video.playCount,
        lastPlayed: video.lastPlayed
      }
    });

  } catch (error) {
    console.error("Play video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating play count",
      error: error.message
    });
  }
};