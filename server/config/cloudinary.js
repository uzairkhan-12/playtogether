import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Validate Cloudinary environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("❌ Missing Cloudinary configuration. Please check your .env file.");
  console.log("Required variables:");
  console.log("- CLOUDINARY_CLOUD_NAME");
  console.log("- CLOUDINARY_API_KEY"); 
  console.log("- CLOUDINARY_API_SECRET");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // Enhanced configuration for large file uploads
  secure: true, // Use HTTPS
  timeout: 600000, // 10 minutes timeout
  // Remove limits that might cause 413 errors
  max_file_size: 200 * 1024 * 1024, // 200MB limit for safety
});

// Test Cloudinary connection
try {
  console.log("🔧 Cloudinary configured with cloud name:", process.env.CLOUDINARY_CLOUD_NAME);
} catch (error) {
  console.error("❌ Cloudinary configuration error:", error.message);
}

export default cloudinary;
