import express from "express";
import {
  register,
  login,
  getProfile,
  pairWithParent,
  generatePairingCode
} from "../controllers/authControler.js";
import { protect, restrictTo } from "../utils/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/profile", protect, getProfile);
router.post("/pair", protect, restrictTo("child"), pairWithParent);
router.post("/generate-code", protect, restrictTo("parent"), generatePairingCode);

export default router;