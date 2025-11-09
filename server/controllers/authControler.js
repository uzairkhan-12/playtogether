import jwt from "jsonwebtoken";
import User from "../Models/User.js";

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role = "parent" } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email"
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    // Generate pairing code for parents
    if (role === "parent") {
      user.generatePairingCode();
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password"
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: user.toJSON(), // This removes password due to toJSON method
        token
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("pairedWith", "name email role");
    
    res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting profile",
      error: error.message
    });
  }
};

// @desc    Pair child with parent using pairing code
// @route   POST /api/auth/pair
// @access  Private
export const pairWithParent = async (req, res) => {
  try {
    const { pairingCode } = req.body;
    const childId = req.user.id;

    if (!pairingCode) {
      return res.status(400).json({
        success: false,
        message: "Pairing code is required"
      });
    }

    // Find parent with the pairing code
    const parent = await User.findOne({ 
      pairingCode: pairingCode.toUpperCase(),
      role: "parent"
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Invalid pairing code"
      });
    }

    // Get child user
    const child = await User.findById(childId);
    if (child.role !== "child") {
      return res.status(400).json({
        success: false,
        message: "Only child accounts can pair with parents"
      });
    }

    // Check if parent is already paired
    if (parent.pairedWith) {
      return res.status(400).json({
        success: false,
        message: "Parent is already paired with another device"
      });
    }

    // Check if child is already paired
    if (child.pairedWith) {
      return res.status(400).json({
        success: false,
        message: "Child is already paired with another device"
      });
    }

    // Pair the devices
    parent.pairedWith = child._id;
    child.pairedWith = parent._id;

    await parent.save();
    await child.save();

    res.status(200).json({
      success: true,
      message: "Successfully paired with parent",
      data: {
        child: child.toJSON(),
        parent: {
          _id: parent._id,
          name: parent.name,
          email: parent.email
        }
      }
    });

  } catch (error) {
    console.error("Pairing error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during pairing",
      error: error.message
    });
  }
};

// @desc    Generate new pairing code for parent
// @route   POST /api/auth/generate-code
// @access  Private (Parent only)
export const generatePairingCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== "parent") {
      return res.status(403).json({
        success: false,
        message: "Only parents can generate pairing codes"
      });
    }

    const newCode = user.generatePairingCode();
    await user.save();

    res.status(200).json({
      success: true,
      message: "New pairing code generated",
      data: { pairingCode: newCode }
    });

  } catch (error) {
    console.error("Generate code error:", error);
    res.status(500).json({
      success: false,
      message: "Server error generating pairing code",
      error: error.message
    });
  }
};

