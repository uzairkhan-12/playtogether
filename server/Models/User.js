import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [50, "Name cannot exceed 50 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid email"
    ]
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ["parent", "child"],
    required: [true, "Role is required"],
    default: "parent"
  },
  // For parent-child pairing
  pairingCode: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  pairedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  // Additional fields for the app
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  deviceInfo: {
    type: String,
    default: ""
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate unique pairing code for parents
userSchema.methods.generatePairingCode = function () {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  this.pairingCode = code;
  return code;
};

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const User = mongoose.model("User", userSchema);
export default User;