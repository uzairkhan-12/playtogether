import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import Video from "../Models/Video.js";

// Store active connections
const activeConnections = new Map();
const parentChildRooms = new Map();

// Socket.IO middleware for authentication
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error("Authentication token required"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(new Error("Invalid token - user not found"));
    }

    // Attach user to socket
    socket.user = user;
    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    next(new Error("Authentication failed"));
  }
};

// Handle socket connection
export const handleConnection = (io) => {
  return (socket) => {
    console.log(`🔌 ${socket.user.role} connected:`, {
      id: socket.id,
      userId: socket.user._id,
      name: socket.user.name,
      email: socket.user.email
    });

    // Store active connection
    activeConnections.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date()
    });

    // Handle pairing and room joining
    handlePairing(socket, io);

    // Video control events
    setupVideoControlEvents(socket, io);

    // Connection status events
    setupConnectionEvents(socket, io);

    // Handle disconnection
    socket.on("disconnect", () => {
      handleDisconnection(socket, io);
    });
  };
};

// Handle parent-child pairing and room management
const handlePairing = (socket, io) => {
  const user = socket.user;
  
  if (user.role === "parent" && user.pairedWith) {
    // Parent joins their own room
    const roomId = `family_${user._id}`;
    socket.join(roomId);
    
    console.log(`👨‍👩‍👧‍👦 Parent ${user.name} joined room: ${roomId}`);
    
    // Notify child if connected
    const childConnection = activeConnections.get(user.pairedWith.toString());
    if (childConnection) {
      io.to(childConnection.socketId).emit("parent_connected", {
        message: "Parent is now online",
        parentName: user.name
      });
    }
    
    // Store room mapping
    parentChildRooms.set(user._id.toString(), roomId);
    
  } else if (user.role === "child" && user.pairedWith) {
    // Child joins parent's room
    const roomId = `family_${user.pairedWith}`;
    socket.join(roomId);
    
    console.log(`👶 Child ${user.name} joined room: ${roomId}`);
    
    // Notify parent if connected
    const parentConnection = activeConnections.get(user.pairedWith.toString());
    if (parentConnection) {
      io.to(parentConnection.socketId).emit("child_connected", {
        message: "Child is now online",
        childName: user.name
      });
    }
  }
};

// Setup video control events
const setupVideoControlEvents = (socket, io) => {
  const user = socket.user;

  // Parent video control events
  if (user.role === "parent") {
    // Play video
    socket.on("video_play", async (data) => {
      try {
        const { videoId, currentTime = 0 } = data;
        
        // Verify parent owns the video
        const video = await Video.findOne({ _id: videoId, uploadedBy: user._id });
        if (!video) {
          socket.emit("error", { message: "Video not found or access denied" });
          return;
        }

        const roomId = `family_${user._id}`;
        console.log(`▶️ Parent ${user.name} playing video: ${video.title}`);
        
        // Send to child
        socket.to(roomId).emit("video_control", {
          action: "play",
          videoId,
          currentTime,
          video: {
            title: video.title,
            url: video.cloudinaryUrl,
            duration: video.duration
          },
          timestamp: new Date()
        });

        // Increment play count
        await video.incrementPlayCount();
        
      } catch (error) {
        console.error("Video play error:", error);
        socket.emit("error", { message: "Failed to play video" });
      }
    });

    // Pause video
    socket.on("video_pause", (data) => {
      const { videoId, currentTime } = data;
      const roomId = `family_${user._id}`;
      
      console.log(`⏸️ Parent ${user.name} paused video at ${currentTime}s`);
      
      socket.to(roomId).emit("video_control", {
        action: "pause",
        videoId,
        currentTime,
        timestamp: new Date()
      });
    });

    // Seek video
    socket.on("video_seek", (data) => {
      const { videoId, seekTime } = data;
      const roomId = `family_${user._id}`;
      
      console.log(`⏩ Parent ${user.name} seeking to ${seekTime}s`);
      
      socket.to(roomId).emit("video_control", {
        action: "seek",
        videoId,
        seekTime,
        timestamp: new Date()
      });
    });

    // Volume control
    socket.on("video_volume", (data) => {
      const { videoId, volume } = data;
      const roomId = `family_${user._id}`;
      
      console.log(`🔊 Parent ${user.name} set volume to ${volume}%`);
      
      socket.to(roomId).emit("video_control", {
        action: "volume",
        videoId,
        volume,
        timestamp: new Date()
      });
    });

    // Stop video
    socket.on("video_stop", (data) => {
      const { videoId } = data;
      const roomId = `family_${user._id}`;
      
      console.log(`⏹️ Parent ${user.name} stopped video`);
      
      socket.to(roomId).emit("video_control", {
        action: "stop",
        videoId,
        timestamp: new Date()
      });
    });

    // Next video
    socket.on("video_next", async (data) => {
      try {
        const { currentVideoId } = data;
        const videos = await Video.find({ 
          uploadedBy: user._id, 
          isActive: true 
        }).sort({ createdAt: -1 });
        
        const currentIndex = videos.findIndex(v => v._id.toString() === currentVideoId);
        const nextVideo = videos[currentIndex + 1] || videos[0]; // Loop to first
        
        if (nextVideo) {
          const roomId = `family_${user._id}`;
          
          console.log(`⏭️ Parent ${user.name} switching to next video: ${nextVideo.title}`);
          
          socket.to(roomId).emit("video_control", {
            action: "next",
            videoId: nextVideo._id,
            video: {
              title: nextVideo.title,
              url: nextVideo.cloudinaryUrl,
              duration: nextVideo.duration
            },
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error("Next video error:", error);
        socket.emit("error", { message: "Failed to load next video" });
      }
    });

    // Previous video
    socket.on("video_previous", async (data) => {
      try {
        const { currentVideoId } = data;
        const videos = await Video.find({ 
          uploadedBy: user._id, 
          isActive: true 
        }).sort({ createdAt: -1 });
        
        const currentIndex = videos.findIndex(v => v._id.toString() === currentVideoId);
        const prevVideo = videos[currentIndex - 1] || videos[videos.length - 1]; // Loop to last
        
        if (prevVideo) {
          const roomId = `family_${user._id}`;
          
          console.log(`⏮️ Parent ${user.name} switching to previous video: ${prevVideo.title}`);
          
          socket.to(roomId).emit("video_control", {
            action: "previous",
            videoId: prevVideo._id,
            video: {
              title: prevVideo.title,
              url: prevVideo.cloudinaryUrl,
              duration: prevVideo.duration
            },
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error("Previous video error:", error);
        socket.emit("error", { message: "Failed to load previous video" });
      }
    });
  }

  // Child acknowledgment events
  if (user.role === "child") {
    // Child acknowledges video control received
    socket.on("video_control_ack", (data) => {
      const { action, videoId, status } = data;
      
      // Find parent connection
      const parentConnection = activeConnections.get(user.pairedWith.toString());
      if (parentConnection) {
        io.to(parentConnection.socketId).emit("child_status", {
          action,
          videoId,
          status,
          childName: user.name,
          timestamp: new Date()
        });
      }
    });

    // Child sends playback status updates
    socket.on("playback_status", (data) => {
      const { videoId, currentTime, isPlaying, volume } = data;
      
      const parentConnection = activeConnections.get(user.pairedWith.toString());
      if (parentConnection) {
        io.to(parentConnection.socketId).emit("child_playback_status", {
          videoId,
          currentTime,
          isPlaying,
          volume,
          childName: user.name,
          timestamp: new Date()
        });
      }
    });
  }
};

// Setup connection status events
const setupConnectionEvents = (socket, io) => {
  // Ping/Pong for connection health
  socket.on("ping", () => {
    socket.emit("pong", { timestamp: new Date() });
  });

  // Get online status of paired user
  socket.on("get_paired_status", () => {
    const user = socket.user;
    const pairedUserId = user.pairedWith?.toString();
    
    if (pairedUserId) {
      const pairedConnection = activeConnections.get(pairedUserId);
      socket.emit("paired_status", {
        isOnline: !!pairedConnection,
        lastSeen: pairedConnection?.connectedAt || null
      });
    }
  });

  // Get active connections count
  socket.on("get_connection_info", () => {
    socket.emit("connection_info", {
      totalConnections: activeConnections.size,
      userRole: socket.user.role,
      connectedAt: activeConnections.get(socket.user._id.toString())?.connectedAt
    });
  });
};

// Handle disconnection
const handleDisconnection = (socket, io) => {
  const user = socket.user;
  console.log(`🔌 ${user.role} disconnected:`, user.name);

  // Remove from active connections
  activeConnections.delete(user._id.toString());

  // Notify paired user
  if (user.pairedWith) {
    const pairedConnection = activeConnections.get(user.pairedWith.toString());
    if (pairedConnection) {
      const eventName = user.role === "parent" ? "parent_disconnected" : "child_disconnected";
      io.to(pairedConnection.socketId).emit(eventName, {
        message: `${user.role} is now offline`,
        userName: user.name,
        disconnectedAt: new Date()
      });
    }
  }

  // Clean up room mapping
  if (user.role === "parent") {
    parentChildRooms.delete(user._id.toString());
  }
};

// Utility function to get connection stats
export const getConnectionStats = () => {
  return {
    totalConnections: activeConnections.size,
    activeRooms: parentChildRooms.size,
    connections: Array.from(activeConnections.values()).map(conn => ({
      userId: conn.user._id,
      name: conn.user.name,
      role: conn.user.role,
      connectedAt: conn.connectedAt
    }))
  };
};