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
  // Video metadata
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  fileSize: {
    type: Number, // Size in bytes
    default: 0
  },
  format: {
    type: String,
    default: "mp4"
  },
  quality: {
    type: String,
    enum: ["low", "medium", "high", "auto"],
    default: "auto"
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
  }
}, {
  timestamps: true
});

// Index for faster queries
videoSchema.index({ uploadedBy: 1, createdAt: -1 });
videoSchema.index({ isActive: 1 });

// Method to increment play count
videoSchema.methods.incrementPlayCount = function () {
  this.playCount += 1;
  this.lastPlayed = new Date();
  return this.save();
};

const Video = mongoose.model("Video", videoSchema);
export default Video;