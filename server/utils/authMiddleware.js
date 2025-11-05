import jwt from "jsonwebtoken";
import User from "../Models/User.js";

// Protect routes - require authentication
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found."
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated."
      });
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message
    });
  }
};

// Restrict to specific roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`
      });
    }
    next();
  };
};

// Check if user is paired (for child users)
export const requirePairing = async (req, res, next) => {
  try {
    if (req.user.role === "child" && !req.user.pairedWith) {
      return res.status(403).json({
        success: false,
        message: "Child account must be paired with a parent to access this feature"
      });
    }
    next();
  } catch (error) {
    console.error("Pairing check error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking pairing status",
      error: error.message
    });
  }
};