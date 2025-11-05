import cloudinary from "../config/cloudinary.js";
import Video from "../Models/Video.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { promisify } from 'util';
import { createReadStream, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Promisify ffmpeg functions
const ffprobeAsync = promisify(ffmpeg.ffprobe);

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
      { 
        quality: "auto:good",
        format: "jpg",
        transformation: [
          { width: 300, height: 200, crop: "fill" },
          { quality: "auto" }
        ]
      }, // Generate thumbnail
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

// Function to get video duration using ffmpeg
const getVideoDuration = async (filePath) => {
  try {
    const metadata = await ffprobeAsync(filePath);
    return metadata.format.duration;
  } catch (error) {
    console.error('Error getting video duration:', error);
    throw new Error('Could not extract video duration');
  }
};

// Function to generate thumbnail using ffmpeg
const generateThumbnail = async (filePath, outputPath, timeInSeconds = 1) => {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: 'thumbnail.jpg',
        folder: outputPath,
        size: '300x200'
      })
      .on('end', () => {
        resolve(join(outputPath, 'thumbnail.jpg'));
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

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

    const { title, description, duration } = req.body;

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

    const publicId = req.file.filename;

    // Get video duration - use provided duration or extract from Cloudinary
    let videoDuration = parseInt(duration) || 0;
    let thumbnailUrl = null;

    // If no duration provided, try to get from Cloudinary
    if (!videoDuration) {
      try {
        // Wait a bit for Cloudinary processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const cloudinaryDetails = await cloudinary.api.resource(publicId, { 
          resource_type: "video" 
        });
        
        if (cloudinaryDetails.duration) {
          videoDuration = Math.round(cloudinaryDetails.duration);
          console.log('Duration from Cloudinary:', videoDuration);
        }
      } catch (cloudinaryError) {
        console.log("Could not fetch video details from Cloudinary:", cloudinaryError.message);
        // Duration will remain 0 and can be updated later
      }
    }

    // Generate thumbnail URL using Cloudinary transformation
    try {
      thumbnailUrl = cloudinary.url(publicId, {
        resource_type: "video",
        secure: true, // Use HTTPS URLs
        format: "jpg", // Explicitly set format
        transformation: [
          { width: 300, height: 200, crop: "fill" },
          { quality: "auto" }
        ]
      });
      console.log('Generated thumbnail URL:', thumbnailUrl);
    } catch (thumbnailError) {
      console.error('Error generating thumbnail URL:', thumbnailError);
    }

    // Prepare video data
    const videoData = {
      title: title.trim(),
      description: (description || "").trim(),
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: publicId,
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

    // If duration is still 0, set up a background job to update it later
    if (!videoDuration) {
      setTimeout(async () => {
        try {
          const cloudinaryDetails = await cloudinary.api.resource(publicId, { 
            resource_type: "video" 
          });
          
          if (cloudinaryDetails.duration) {
            await Video.findByIdAndUpdate(video._id, {
              duration: Math.round(cloudinaryDetails.duration),
              uploadStatus: "completed",
              metadataExtracted: true
            });
            console.log(`Updated duration for video ${video._id}: ${cloudinaryDetails.duration}`);
          }
        } catch (error) {
          console.error(`Failed to update duration for video ${video._id}:`, error);
        }
      }, 10000); // Wait 10 seconds then try again
    }

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      data: { 
        video: {
          _id: video._id,
          title: video.title,
          description: video.description,
          cloudinaryUrl: video.cloudinaryUrl,
          duration: video.duration,
          thumbnailUrl: video.thumbnailUrl,
          fileSize: video.fileSize,
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
    console.error("Upload video error:", error);
    
    // Clean up: Delete file from Cloudinary if database save fails
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: "video" });
        console.log("Cleaned up failed upload from Cloudinary");
      } catch (cleanupError) {
        console.error("Error cleaning up Cloudinary file:", cleanupError);
      }
    }

    // Handle specific errors
    if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        message: "Upload was interrupted. Please try again with a stable connection.",
        error: "CONNECTION_RESET"
      });
    }
    
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
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
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

    // Ensure all videos have duration and thumbnail
    const videosWithMetadata = await Promise.all(
      videos.map(async (video) => {
        // If video doesn't have duration, try to get it from Cloudinary
        if (!video.duration || video.duration === 0) {
          try {
            const cloudinaryDetails = await cloudinary.api.resource(
              video.cloudinaryPublicId, 
              { resource_type: "video" }
            );
            
            if (cloudinaryDetails.duration) {
              video.duration = Math.round(cloudinaryDetails.duration);
              await video.save();
            }
          } catch (error) {
            console.log(`Could not update duration for video ${video._id}:`, error.message);
          }
        }

        // If video doesn't have thumbnail, try to generate one
        if (!video.thumbnailUrl) {
          try {
            // Generate thumbnail URL using Cloudinary transformation
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
            await video.save();
          } catch (error) {
            console.log(`Could not generate thumbnail for video ${video._id}:`, error.message);
          }
        }

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

    // Ensure video has duration and thumbnail
    let updated = false;
    
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