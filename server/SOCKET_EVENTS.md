# 🔌 Socket.IO Video Control Events Documentation

## 📡 Connection & Authentication

### Initial Connection
```javascript
const socket = io('http://localhost:8888', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});
```

### Connection Events
- `connect` - Client connected successfully
- `disconnect` - Client disconnected
- `error` - Connection or authentication error

---

## 👨‍👩‍👧‍👦 Parent-Child Pairing Events

### Pairing Status Events
| Event | Emitted By | Received By | Data |
|-------|------------|-------------|------|
| `parent_connected` | Server | Child | `{ message, parentName }` |
| `child_connected` | Server | Parent | `{ message, childName }` |
| `parent_disconnected` | Server | Child | `{ message, userName, disconnectedAt }` |
| `child_disconnected` | Server | Parent | `{ message, userName, disconnectedAt }` |

---

## 🎮 Video Control Events (Parent → Child)

### 1. Play Video
**Parent Emits:**
```javascript
socket.emit('video_play', {
  videoId: '673123456789abcdef123456',
  currentTime: 0  // Optional start time in seconds
});
```

**Child Receives:**
```javascript
socket.on('video_control', (data) => {
  // data = {
  //   action: 'play',
  //   videoId: '673123456789abcdef123456',
  //   currentTime: 0,
  //   video: {
  //     title: 'Video Title',
  //     url: 'https://cloudinary.com/video/url',
  //     duration: 180
  //   },
  //   timestamp: '2025-11-03T10:30:00.000Z'
  // }
});
```

### 2. Pause Video
**Parent Emits:**
```javascript
socket.emit('video_pause', {
  videoId: '673123456789abcdef123456',
  currentTime: 45  // Current playback time
});
```

### 3. Seek Video
**Parent Emits:**
```javascript
socket.emit('video_seek', {
  videoId: '673123456789abcdef123456',
  seekTime: 120  // Time to seek to in seconds
});
```

### 4. Volume Control
**Parent Emits:**
```javascript
socket.emit('video_volume', {
  videoId: '673123456789abcdef123456',
  volume: 75  // Volume percentage (0-100)
});
```

### 5. Stop Video
**Parent Emits:**
```javascript
socket.emit('video_stop', {
  videoId: '673123456789abcdef123456'
});
```

### 6. Next Video
**Parent Emits:**
```javascript
socket.emit('video_next', {
  currentVideoId: '673123456789abcdef123456'
});
```

**Child Receives:**
```javascript
socket.on('video_control', (data) => {
  // data = {
  //   action: 'next',
  //   videoId: 'new_video_id',
  //   video: { title, url, duration },
  //   timestamp: '2025-11-03T10:30:00.000Z'
  // }
});
```

### 7. Previous Video
**Parent Emits:**
```javascript
socket.emit('video_previous', {
  currentVideoId: '673123456789abcdef123456'
});
```

---

## 📊 Child Status & Acknowledgment Events

### 1. Control Acknowledgment
**Child Emits:**
```javascript
socket.emit('video_control_ack', {
  action: 'play',  // The action that was acknowledged
  videoId: '673123456789abcdef123456',
  status: 'success'  // 'success' or 'error'
});
```

**Parent Receives:**
```javascript
socket.on('child_status', (data) => {
  // data = {
  //   action: 'play',
  //   videoId: '673123456789abcdef123456',
  //   status: 'success',
  //   childName: 'Child Name',
  //   timestamp: '2025-11-03T10:30:00.000Z'
  // }
});
```

### 2. Playback Status Updates
**Child Emits:**
```javascript
socket.emit('playback_status', {
  videoId: '673123456789abcdef123456',
  currentTime: 45.5,  // Current playback time
  isPlaying: true,     // Playing state
  volume: 80          // Current volume
});
```

**Parent Receives:**
```javascript
socket.on('child_playback_status', (data) => {
  // data = {
  //   videoId: '673123456789abcdef123456',
  //   currentTime: 45.5,
  //   isPlaying: true,
  //   volume: 80,
  //   childName: 'Child Name',
  //   timestamp: '2025-11-03T10:30:00.000Z'
  // }
});
```

---

## 🔗 Connection Status Events

### 1. Ping/Pong (Heartbeat)
```javascript
// Client sends ping
socket.emit('ping');

// Server responds with pong
socket.on('pong', (data) => {
  // data = { timestamp: '2025-11-03T10:30:00.000Z' }
});
```

### 2. Get Paired User Status
```javascript
// Check if paired user is online
socket.emit('get_paired_status');

socket.on('paired_status', (data) => {
  // data = {
  //   isOnline: true,
  //   lastSeen: '2025-11-03T10:25:00.000Z'
  // }
});
```

### 3. Get Connection Info
```javascript
socket.emit('get_connection_info');

socket.on('connection_info', (data) => {
  // data = {
  //   totalConnections: 5,
  //   userRole: 'parent',
  //   connectedAt: '2025-11-03T10:20:00.000Z'
  // }
});
```

---

## ❌ Error Handling

### Socket Errors
```javascript
socket.on('error', (error) => {
  // error = { message: 'Error description' }
  console.error('Socket error:', error);
});
```

### Authentication Errors
- "Authentication token required"
- "Invalid token - user not found"
- "Authentication failed"

### Video Control Errors
- "Video not found or access denied"
- "Failed to play video"
- "Failed to load next video"

---

## 🧪 Testing Socket.IO Events

### Basic Connection Test
```javascript
// Test parent connection
const parentSocket = io('http://localhost:8888', {
  auth: { token: PARENT_JWT_TOKEN }
});

parentSocket.on('connect', () => {
  console.log('Parent connected');
  
  // Test video play
  parentSocket.emit('video_play', {
    videoId: 'your_video_id',
    currentTime: 0
  });
});
```

### Test Child Response
```javascript
// Test child connection
const childSocket = io('http://localhost:8888', {
  auth: { token: CHILD_JWT_TOKEN }
});

childSocket.on('video_control', (data) => {
  console.log('Video control received:', data);
  
  // Acknowledge
  childSocket.emit('video_control_ack', {
    action: data.action,
    videoId: data.videoId,
    status: 'success'
  });
});
```

---

## 📡 REST API for Socket Stats

### Get Connection Statistics
```
GET http://localhost:8888/api/socket/stats

Response:
{
  "success": true,
  "data": {
    "totalConnections": 2,
    "activeRooms": 1,
    "connections": [
      {
        "userId": "673123456789abcdef654321",
        "name": "Parent Name",
        "role": "parent",
        "connectedAt": "2025-11-03T10:20:00.000Z"
      }
    ]
  }
}
```

---

## 🚀 Integration Examples

### React Native Parent App
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8888', {
  auth: { token: parentToken }
});

// Play video function
const playVideo = (videoId) => {
  socket.emit('video_play', { videoId, currentTime: 0 });
};

// Listen for child status
socket.on('child_playback_status', (status) => {
  setChildPlaybackStatus(status);
});
```

### React Native Child App
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8888', {
  auth: { token: childToken }
});

// Listen for video controls
socket.on('video_control', (control) => {
  switch(control.action) {
    case 'play':
      videoPlayer.play();
      break;
    case 'pause':
      videoPlayer.pause();
      break;
    case 'seek':
      videoPlayer.seekTo(control.seekTime);
      break;
  }
  
  // Acknowledge
  socket.emit('video_control_ack', {
    action: control.action,
    videoId: control.videoId,
    status: 'success'
  });
});
```