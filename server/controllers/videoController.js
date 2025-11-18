import Video from "../Models/Video.js";
import multer from "multer";
import { promises as fsPromises, createReadStream, unlinkSync, existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import { tmpdir } from 'os';
import { join } from 'path';
import os from 'os';

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Helper: get a LAN IP address (first non-internal IPv4)
const getLocalIp = () => {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
};



// Configure local disk storage for uploads
// Enhanced multer configuration for large file uploads
const uploadDir = join(process.cwd(), 'uploads', 'videos');
const thumbDir = join(process.cwd(), 'uploads', 'thumbnails');

// Ensure upload directories exist
if (!existsSync(uploadDir)) {
  try { fsPromises.mkdir(uploadDir, { recursive: true }); } catch (e) { console.warn('Could not create upload dir', e); }
}
if (!existsSync(thumbDir)) {
  try { fsPromises.mkdir(thumbDir, { recursive: true }); } catch (e) { console.warn('Could not create thumbnail dir', e); }
}

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_');
    const filename = `${Date.now()}_${cleanName}`;
    cb(null, filename);
  }
});

// Multer configuration for local storage (allow up to 300MB)
export const upload = multer({ 
  storage: diskStorage,
  limits: {
    fileSize: 300 * 1024 * 1024, // 300MB
    fieldNameSize: 500,
    fieldSize: 5 * 1024 * 1024,
    fields: 10,
    files: 1,
    parts: 20
  },
  fileFilter: (req, file, cb) => {
    console.log(`📹 Uploading video: ${file.originalname}, Type: ${file.mimetype}`);
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Video format ${file.mimetype} not supported. Please use MP4, MOV, AVI, MKV, or WebM.`), false);
      }
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

// Function to get video duration using ffmpeg (alternative to ffprobe)
const getVideoDuration = async (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error getting video duration:', err);
        reject(new Error('Could not extract video duration: ' + err.message));
      } else {
        const duration = metadata.format.duration;
        resolve(duration);
      }
    });
  });
};

// Function to generate thumbnail using ffmpeg
const generateThumbnail = async (filePath, outputPath, outputFilename, timeInSeconds = 1) => {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: outputFilename,
        folder: outputPath,
        size: '300x200'
      })
      .on('end', () => {
        resolve(join(outputPath, outputFilename));
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};



// @desc    Upload a video - Enhanced for large files up to 300MB
// @route   POST /api/videos/upload
// @access  Private (Parent only)
export const uploadVideo = async (req, res) => {
  const uploadStartTime = Date.now();
  console.log('📤 Starting video upload process...', new Date().toISOString());
  
  try {
    // Enhanced file validation
    if (!req.file) {
      console.error('❌ No file provided in request');
      return res.status(400).json({
        success: false,
        message: "No video file provided",
        errorCode: "NO_FILE"
      });
    }

    const { title, description, duration } = req.body;
    const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);

    console.log("📹 File uploaded to Cloudinary:", {
      filename: req.file.filename,
      url: req.file.path,
      size: `${fileSizeMB} MB`,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype
    });

    // Enhanced title validation
    if (!title || title.trim() === '') {
      console.error('❌ No title provided, cleaning up...');
      // Delete uploaded file from Cloudinary if validation fails
      try {
        const publicIdToDelete = req.file.filename;
        await cloudinary.uploader.destroy(publicIdToDelete, { resource_type: "video" });
        console.log('🧹 Cleaned up file due to validation failure');
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
      return res.status(400).json({
        success: false,
        message: "Video title is required",
        errorCode: "MISSING_TITLE"
      });
    }

    const filename = req.file.filename;
    const filePath = req.file.path;

    // Get video duration - use provided duration or extract locally
    let videoDuration = parseInt(duration) || 0;
    let thumbnailUrl = null;

    if (!videoDuration) {
      try {
        // Extract duration locally using ffprobe
        videoDuration = Math.round(await getVideoDuration(filePath));
      } catch (durationError) {
        console.error('❌ Could not extract duration locally:', durationError.message);
        videoDuration = 0; // Will try again later
      }
    }

    // Generate thumbnail to thumbnails folder
    try {
      const thumbFilename = `${Date.now()}_${filename}.jpg`;
      const thumbPath = await generateThumbnail(filePath, thumbDir, thumbFilename, 1);
      // Create full server URL for thumbnail - use detected LAN IP for mobile compatibility
      thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
      console.log('Generated thumbnail at:', thumbPath);
    } catch (thumbError) {
      console.warn('Thumbnail generation failed:', thumbError.message);
    }

    // Create full server URLs - use detected LAN IP for mobile compatibility
    const fullVideoUrl = `/uploads/videos/${filename}`;

    // Prepare video data for local storage
    const videoData = {
      title: title.trim(),
      description: (description || "").trim(),
      url: fullVideoUrl,
      storageId: filename,
      duration: videoDuration,
      thumbnailUrl: thumbnailUrl,
      fileSize: req.file.size || 0,
      format: req.file.originalname.split('.').pop().toLowerCase() || "mp4",
      uploadedBy: req.user.id,
      uploadStatus: videoDuration > 0 ? "completed" : "processing",
      metadataExtracted: videoDuration > 0,
      thumbnailGenerated: !!thumbnailUrl
    };

    // Save video info to database
    const video = await Video.create(videoData);

    // If duration is still 0, set up a background job to update it later from local file
    if (!videoDuration) {
      setTimeout(async () => {
        try {
          const dur = Math.round(await getVideoDuration(filePath));
          if (dur) {
            await Video.findByIdAndUpdate(video._id, {
              duration: dur,
              uploadStatus: "completed",
              metadataExtracted: true
            });
          }
        } catch (error) {
          console.error(`Failed to update duration for video ${video._id}:`, error);
        }
      }, 10000); // Wait 10 seconds then try again
    }

    const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
    console.log(`✅ Video upload completed successfully in ${uploadTime} seconds`);
    console.log(`📊 Final video details:`, {
      id: video._id,
      title: video.title,
      size: `${fileSizeMB} MB`,
      duration: video.duration || 'Processing...',
      status: video.uploadStatus
    });

    res.status(201).json({
      success: true,
      message: `Video uploaded successfully! 🎉 (${uploadTime}s)`,
      uploadTime: `${uploadTime} seconds`,
      data: { 
        video: {
          _id: video._id,
          title: video.title,
          description: video.description,
          cloudinaryUrl: video.cloudinaryUrl,
          duration: video.duration,
          thumbnailUrl: video.thumbnailUrl,
          fileSize: video.fileSize,
          fileSizeMB: `${fileSizeMB} MB`,
          format: video.format,
          uploadStatus: video.uploadStatus,
          playCount: video.playCount,
          uploadedBy: video.uploadedBy,
          createdAt: video.createdAt,
          updatedAt: video.updatedAt
        }
      }
    });

  } catch (error) {
    const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
    console.error("❌ Upload video error after", uploadTime, "seconds:", error);
    
    // Clean up: Delete file from Cloudinary if database save fails
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: "video" });
        console.log("🧹 Cleaned up failed upload from Cloudinary");
      } catch (cleanupError) {
        console.error("Error cleaning up Cloudinary file:", cleanupError);
      }
    }

    // Enhanced error handling for different scenarios
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: "File too large! Maximum size allowed is 100MB due to Cloudinary free tier limits.",
        errorCode: "FILE_TOO_LARGE",
        maxSize: "100MB",
        suggestion: "Please compress your video to under 100MB or upgrade to Cloudinary Pro"
      });
    }

    if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        message: "Upload was interrupted. This often happens with large files or unstable connections. Please try again.",
        errorCode: "CONNECTION_RESET",
        suggestion: "Try using a stable WiFi connection and ensure your video is under 300MB"
      });
    }

    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        message: "Upload timed out. Large files may take longer to process. Please try again.",
        errorCode: "TIMEOUT",
        suggestion: "For files over 100MB, please ensure you have a stable connection"
      });
    }

    if (error.message?.includes('Invalid image file') || error.message?.includes('not supported')) {
      return res.status(400).json({
        success: false,
        message: "Invalid video file format. Please use MP4, MOV, AVI, MKV, or WebM.",
        errorCode: "INVALID_FORMAT"
      });
    }

    if (error.code === 'ENOTFOUND' || error.message?.includes('network')) {
      return res.status(503).json({
        success: false,
        message: "Network error during upload. Please check your internet connection.",
        errorCode: "NETWORK_ERROR"
      });
    }
    
    if (error.http_code === 413 || error.message?.includes('413') || error.message?.includes('unexpected status code - 413')) {
      return res.status(413).json({
        success: false,
        message: "File too large for Cloudinary! The free tier supports videos up to 100MB only.",
        errorCode: "CLOUDINARY_FILE_TOO_LARGE",
        maxSize: "100MB",
        solution: "Please compress your video to under 100MB or upgrade to Cloudinary Pro for larger files.",
        uploadTime: `${uploadTime} seconds`
      });
    }

    if (error.name === 'UnexpectedResponse') {
      return res.status(500).json({
        success: false,
        message: "Video upload service error. Please try again or use a smaller file.",
        error: "CLOUDINARY_UPLOAD_ERROR"
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during video upload",
      errorCode: "SERVER_ERROR",
      uploadTime: `${uploadTime} seconds`,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// Middleware to log upload progress and timing
export const uploadProgressLogger = (req, res, next) => {
  const startTime = Date.now();
  
  console.log('🚀 Upload request received:', {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')?.substring(0, 100) || 'Unknown',
    contentLength: req.get('Content-Length') ? `${(req.get('Content-Length') / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
    contentType: req.get('Content-Type')?.substring(0, 50) || 'Unknown'
  });

  // Monitor request progress
  let uploadProgress = 0;
  const contentLength = parseInt(req.get('Content-Length') || '0');
  
  if (contentLength > 0) {
    req.on('data', (chunk) => {
      uploadProgress += chunk.length;
      const percentComplete = ((uploadProgress / contentLength) * 100).toFixed(1);
      
      // Log progress every 10% for large files
      if (contentLength > 50 * 1024 * 1024 && uploadProgress % Math.floor(contentLength / 10) < chunk.length) {
        console.log(`📊 Upload progress: ${percentComplete}% (${(uploadProgress / (1024 * 1024)).toFixed(1)} MB)`);
      }
    });
  }

  // Override res.json to log response details
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const logLevel = data?.success ? '✅' : '❌';
    
    console.log(`${logLevel} Upload completed in ${responseTime}s:`, {
      status: res.statusCode,
      success: data?.success || false,
      message: data?.message?.substring(0, 100) || 'No message',
      fileSize: data?.data?.video?.fileSizeMB || 'Unknown',
      errorCode: data?.errorCode || null
    });
    
    return originalJson.call(this, data);
  };

  next();
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

    // Ensure all videos have duration and thumbnail
    const videosWithMetadata = await Promise.all(
      videos.map(async (video) => {
          // Keep URL as relative path

          // If video doesn't have duration, try to get it from local file
          if (!video.duration || video.duration === 0) {
            try {
              if (video.storageId) {
                const localPath = join(process.cwd(), 'uploads', 'videos', video.storageId);
                const dur = Math.round(await getVideoDuration(localPath));
                if (dur) {
                  video.duration = dur;
                  await video.save();
                }
              }
            } catch (error) {
              console.log(`Could not update duration for video ${video._id}:`, error.message);
            }
          }

          // If video doesn't have thumbnail, try to generate one locally
          if (!video.thumbnailUrl) {
            try {
              if (video.storageId) {
                const localPath = join(process.cwd(), 'uploads', 'videos', video.storageId);
                const thumbFilename = `${Date.now()}_${video.storageId}.jpg`;
                const thumbPath = await generateThumbnail(localPath, thumbDir, thumbFilename, 1);
                video.thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
                await video.save();
              }
            } catch (error) {
              console.log(`Could not generate thumbnail for video ${video._id}:`, error.message);
            }
          }
          
          // Keep thumbnail URL as relative path

        return video;
      })
    );

    res.status(200).json({
      success: true,
      count: videosWithMetadata.length,
      data: { videos: videosWithMetadata }
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

// @desc    Update video duration and thumbnail (for existing videos)
// @route   POST /api/videos/:id/update-metadata
// @access  Private
export const updateVideoMetadata = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Check authorization
    if (req.user.role === "parent" && video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    let updated = false;

    // Update duration if missing
    if (!video.duration || video.duration === 0) {
      try {
        const cloudinaryDetails = await cloudinary.api.resource(
          video.cloudinaryPublicId, 
          { resource_type: "video" }
        );
        
        if (cloudinaryDetails.duration) {
          video.duration = Math.round(cloudinaryDetails.duration);
          updated = true;
        }
      } catch (error) {
        console.log(`Could not update duration for video ${video._id}:`, error.message);
      }
    }

    // Update thumbnail if missing
    if (!video.thumbnailUrl) {
      try {
        const publicId = video.cloudinaryPublicId;
        const thumbnailUrl = cloudinary.url(publicId, {
          resource_type: "video",
          secure: true, // Use HTTPS URLs
          format: "jpg", // Explicitly set format
          transformation: [
            { width: 300, height: 200, crop: "fill" },
            { quality: "auto" }
          ]
        });
        
        video.thumbnailUrl = thumbnailUrl;
        updated = true;
      } catch (error) {
        console.log(`Could not generate thumbnail for video ${video._id}:`, error.message);
      }
    }

    if (updated) {
      await video.save();
    }

    res.status(200).json({
      success: true,
      message: "Video metadata updated successfully",
      data: { video }
    });

  } catch (error) {
    console.error("Update video metadata error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating video metadata",
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

    // Keep URL as relative path

    // Ensure video has duration and thumbnail
    let updated = false;
    
    if (!video.duration || video.duration === 0) {
      try {
        if (video.storageId) {
          const localPath = join(process.cwd(), 'uploads', 'videos', video.storageId);
          const dur = Math.round(await getVideoDuration(localPath));
          if (dur) {
            video.duration = dur;
            updated = true;
          }
        }
      } catch (error) {
        console.log(`Could not update duration for video ${video._id}:`, error.message);
      }
    }

    if (!video.thumbnailUrl) {
      try {
        if (video.storageId) {
          const localPath = join(process.cwd(), 'uploads', 'videos', video.storageId);
          const thumbFilename = `${Date.now()}_${video.storageId}.jpg`;
          const thumbPath = await generateThumbnail(localPath, thumbDir, thumbFilename, 1);
          video.thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
          updated = true;
        }
      } catch (error) {
        console.log(`Could not generate thumbnail for video ${video._id}:`, error.message);
      }
    }
    
    // Keep thumbnail URL as relative path

    if (updated) {
      await video.save();
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
    // Find video
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

    // Delete local files (video + thumbnail) if present
    try {
      if (video.storageId) {
        const localVideoPath = join(process.cwd(), 'uploads', 'videos', video.storageId);
        if (existsSync(localVideoPath)) {
          await fsPromises.unlink(localVideoPath);
          console.log('🗑️ Deleted local video file:', localVideoPath);
        }
      }
      if (video.thumbnailUrl) {
        const thumbnailFilename = video.thumbnailUrl.split('/').pop();
        if (thumbnailFilename) {
          const thumbLocal = join(process.cwd(), 'uploads', 'thumbnails', thumbnailFilename);
          if (existsSync(thumbLocal)) {
            await fsPromises.unlink(thumbLocal);
            console.log('🗑️ Deleted local thumbnail:', thumbLocal);
          }
        }
      }
    } catch (fileDeleteErr) {
      console.error("Error deleting local files:", fileDeleteErr);
      // Continue with database deletion even if local file deletion fails
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

// @desc    Process Cloudinary webhook for video upload completion
// @route   POST /api/videos/webhook/cloudinary
// @access  Public (called by Cloudinary)
export const cloudinaryWebhook = async (req, res) => {
  try {
    const { notification_type, response } = req.body;

    if (notification_type === 'eager_processing_completed') {
      const publicId = response.public_id;
      
      // Find video by Cloudinary public ID
      const video = await Video.findOne({ cloudinaryPublicId: publicId });
      
      if (video) {
        let updated = false;

        // Update duration if available
        if (response.duration && (!video.duration || video.duration === 0)) {
          video.duration = Math.round(response.duration);
          updated = true;
        }

        // Update thumbnail if eager transformation completed
        if (response.derived && response.derived.length > 0) {
          const thumbnailUrl = response.derived[0].secure_url;
          if (!video.thumbnailUrl) {
            video.thumbnailUrl = thumbnailUrl;
            updated = true;
          }
        }

        if (updated) {
          await video.save();
          console.log(`Updated video metadata via webhook: ${video._id}`);
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Cloudinary webhook error:', error);
    res.status(500).json({ success: false });
  }
};