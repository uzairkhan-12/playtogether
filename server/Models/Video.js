import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Video title is required"],
    trim: true,
    maxlength: [100, "Title cannot exceed 100 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"]
  },
  // Cloudinary video data
  cloudinaryUrl: {
    type: String,
    required: [true, "Video URL is required"]
  },
  cloudinaryPublicId: {
    type: String,
    required: [true, "Cloudinary public ID is required"]
  },
  // Thumbnail information
  thumbnailUrl: {
    type: String,
    default: null
  },
  thumbnailPublicId: {
    type: String,
    default: null
  },
  // Video metadata
  duration: {
    type: Number, // Duration in seconds
    default: 0,
    min: [0, "Duration cannot be negative"]
  },
  fileSize: {
    type: Number, // Size in bytes
    default: 0,
    min: [0, "File size cannot be negative"]
  },
  format: {
    type: String,
    default: "mp4"
  },
  resolution: {
    width: {
      type: Number,
      default: 0
    },
    height: {
      type: Number,
      default: 0
    }
  },
  aspectRatio: {
    type: String,
    default: "16:9"
  },
  frameRate: {
    type: Number,
    default: 0
  },
  bitrate: {
    type: Number, // in kbps
    default: 0
  },
  // Upload and processing status
  uploadStatus: {
    type: String,
    enum: ["processing", "completed", "failed", "pending"],
    default: "pending"
  },
  processingError: {
    type: String,
    default: null
  },
  // Metadata extraction status
  metadataExtracted: {
    type: Boolean,
    default: false
  },
  thumbnailGenerated: {
    type: Boolean,
    default: false
  },
  // Ownership and access
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // Video status
  isActive: {
    type: Boolean,
    default: true
  },
  // Playback tracking
  playCount: {
    type: Number,
    default: 0
  },
  lastPlayed: {
    type: Date,
    default: null
  },
  totalPlayTime: {
    type: Number, // Total play time in seconds
    default: 0
  },
  // Categories and tags for organization
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ["educational", "entertainment", "music", "story", "other"],
    default: "other"
  },
  // Age appropriateness
  ageRating: {
    type: String,
    enum: ["all", "3+", "7+", "12+", "16+", "18+"],
    default: "all"
  }
}, {
  timestamps: true
});

// Virtual for formatted duration (MM:SS)
videoSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return "0:00";
  
  const minutes = Math.floor(this.duration / 60);
  const seconds = Math.floor(this.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for formatted file size
videoSchema.virtual('formattedFileSize').get(function() {
  if (!this.fileSize) return "0 B";
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for video dimensions
videoSchema.virtual('dimensions').get(function() {
  if (this.resolution.width && this.resolution.height) {
    return `${this.resolution.width}x${this.resolution.height}`;
  }
  return "Unknown";
});

// Index for faster queries
videoSchema.index({ uploadedBy: 1, createdAt: -1 });
videoSchema.index({ isActive: 1 });
videoSchema.index({ uploadStatus: 1 });
videoSchema.index({ category: 1 });
videoSchema.index({ ageRating: 1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ duration: 1 });
videoSchema.index({ 'resolution.width': 1, 'resolution.height': 1 });

// Method to increment play count
videoSchema.methods.incrementPlayCount = function () {
  this.playCount += 1;
  this.lastPlayed = new Date();
  return this.save();
};

// Method to add play time
videoSchema.methods.addPlayTime = function (seconds) {
  this.totalPlayTime += seconds;
  return this.save();
};

// Method to update video metadata
videoSchema.methods.updateMetadata = function (metadata) {
  if (metadata.duration) {
    this.duration = metadata.duration;
  }
  if (metadata.fileSize) {
    this.fileSize = metadata.fileSize;
  }
  if (metadata.format) {
    this.format = metadata.format;
  }
  if (metadata.resolution) {
    this.resolution = metadata.resolution;
  }
  if (metadata.bitrate) {
    this.bitrate = metadata.bitrate;
  }
  if (metadata.frameRate) {
    this.frameRate = metadata.frameRate;
  }
  
  this.metadataExtracted = true;
  return this.save();
};

// Method to set thumbnail
videoSchema.methods.setThumbnail = function (thumbnailUrl, thumbnailPublicId = null) {
  this.thumbnailUrl = thumbnailUrl;
  if (thumbnailPublicId) {
    this.thumbnailPublicId = thumbnailPublicId;
  }
  this.thumbnailGenerated = true;
  return this.save();
};

// Method to mark upload as completed
videoSchema.methods.markUploadCompleted = function () {
  this.uploadStatus = "completed";
  return this.save();
};

// Method to mark upload as failed
videoSchema.methods.markUploadFailed = function (errorMessage) {
  this.uploadStatus = "failed";
  this.processingError = errorMessage;
  return this.save();
};

// Static method to find videos by duration range
videoSchema.statics.findByDurationRange = function (minDuration, maxDuration) {
  return this.find({
    duration: { $gte: minDuration, $lte: maxDuration },
    isActive: true
  });
};

// Static method to find videos by category
videoSchema.statics.findByCategory = function (category) {
  return this.find({ 
    category: category,
    isActive: true 
  }).sort({ createdAt: -1 });
};

// Static method to get video statistics for a user
videoSchema.statics.getUserStats = function (userId) {
  return this.aggregate([
    {
      $match: {
        uploadedBy: new mongoose.Types.ObjectId(userId),
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalPlayCount: { $sum: "$playCount" },
        totalPlayTime: { $sum: "$totalPlayTime" },
        totalFileSize: { $sum: "$fileSize" },
        averageDuration: { $avg: "$duration" }
      }
    }
  ]);
};

// Middleware to update aspect ratio when resolution changes
videoSchema.pre('save', function (next) {
  if (this.resolution.width && this.resolution.height) {
    // Calculate aspect ratio
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(this.resolution.width, this.resolution.height);
    const aspectWidth = this.resolution.width / divisor;
    const aspectHeight = this.resolution.height / divisor;
    this.aspectRatio = `${aspectWidth}:${aspectHeight}`;
  }
  next();
});

// Ensure virtual fields are serialized
videoSchema.set('toJSON', { 
  virtuals: true,
  transform: function (doc, ret) {
    // Remove internal fields from JSON output
    delete ret.processingError;
    delete ret.thumbnailPublicId;
    return ret;
  }
});

const Video = mongoose.model("Video", videoSchema);
export default Video;