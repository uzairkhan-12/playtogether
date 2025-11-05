// Socket.IO Test Client for Video Control App
// Run with: node socket-test.js

import { io } from 'socket.io-client';

// Configuration
const SERVER_URL = 'http://localhost:8888';
const PARENT_TOKEN = 'YOUR_PARENT_JWT_TOKEN_HERE';
const CHILD_TOKEN = 'YOUR_CHILD_JWT_TOKEN_HERE';

// Test as Parent
function testParentClient() {
  console.log('🔌 Connecting as Parent...');
  
  const parentSocket = io(SERVER_URL, {
    auth: {
      token: PARENT_TOKEN
    }
  });

  parentSocket.on('connect', () => {
    console.log('✅ Parent connected:', parentSocket.id);
    
    // Test video controls after 2 seconds
    setTimeout(() => {
      testParentControls(parentSocket);
    }, 2000);
  });

  parentSocket.on('child_connected', (data) => {
    console.log('👶 Child connected:', data);
  });

  parentSocket.on('child_status', (data) => {
    console.log('📊 Child status update:', data);
  });

  parentSocket.on('child_playback_status', (data) => {
    console.log('📺 Child playback status:', data);
  });

  parentSocket.on('error', (error) => {
    console.error('❌ Parent error:', error);
  });

  parentSocket.on('disconnect', () => {
    console.log('🔌 Parent disconnected');
  });

  return parentSocket;
}

// Test as Child
function testChildClient() {
  console.log('🔌 Connecting as Child...');
  
  const childSocket = io(SERVER_URL, {
    auth: {
      token: CHILD_TOKEN
    }
  });

  childSocket.on('connect', () => {
    console.log('✅ Child connected:', childSocket.id);
  });

  childSocket.on('parent_connected', (data) => {
    console.log('👨‍👩‍👧‍👦 Parent connected:', data);
  });

  childSocket.on('video_control', (data) => {
    console.log('🎮 Video control received:', data);
    
    // Acknowledge the control
    childSocket.emit('video_control_ack', {
      action: data.action,
      videoId: data.videoId,
      status: 'success'
    });

    // Simulate playback status update
    setTimeout(() => {
      childSocket.emit('playback_status', {
        videoId: data.videoId,
        currentTime: data.currentTime || 0,
        isPlaying: data.action === 'play',
        volume: data.volume || 100
      });
    }, 1000);
  });

  childSocket.on('error', (error) => {
    console.error('❌ Child error:', error);
  });

  childSocket.on('disconnect', () => {
    console.log('🔌 Child disconnected');
  });

  return childSocket;
}

// Test parent video controls
function testParentControls(parentSocket) {
  console.log('🎮 Testing parent video controls...');
  
  const testVideoId = '673123456789abcdef123456'; // Replace with actual video ID
  
  // Test play
  setTimeout(() => {
    console.log('▶️ Testing video play...');
    parentSocket.emit('video_play', {
      videoId: testVideoId,
      currentTime: 0
    });
  }, 1000);

  // Test pause
  setTimeout(() => {
    console.log('⏸️ Testing video pause...');
    parentSocket.emit('video_pause', {
      videoId: testVideoId,
      currentTime: 30
    });
  }, 3000);

  // Test seek
  setTimeout(() => {
    console.log('⏩ Testing video seek...');
    parentSocket.emit('video_seek', {
      videoId: testVideoId,
      seekTime: 60
    });
  }, 5000);

  // Test volume
  setTimeout(() => {
    console.log('🔊 Testing volume control...');
    parentSocket.emit('video_volume', {
      videoId: testVideoId,
      volume: 75
    });
  }, 7000);

  // Test next video
  setTimeout(() => {
    console.log('⏭️ Testing next video...');
    parentSocket.emit('video_next', {
      currentVideoId: testVideoId
    });
  }, 9000);

  // Test stop
  setTimeout(() => {
    console.log('⏹️ Testing video stop...');
    parentSocket.emit('video_stop', {
      videoId: testVideoId
    });
  }, 11000);
}

// Test connection status
function testConnectionStatus(socket, role) {
  setTimeout(() => {
    console.log(`📊 Testing ${role} connection status...`);
    
    // Test ping
    socket.emit('ping');
    socket.on('pong', (data) => {
      console.log(`🏓 ${role} pong received:`, data);
    });

    // Test paired status
    socket.emit('get_paired_status');
    socket.on('paired_status', (data) => {
      console.log(`👥 ${role} paired status:`, data);
    });

    // Test connection info
    socket.emit('get_connection_info');
    socket.on('connection_info', (data) => {
      console.log(`ℹ️ ${role} connection info:`, data);
    });
  }, 2000);
}

// Main test function
function runTests() {
  console.log('🚀 Starting Socket.IO Video Control Tests...');
  console.log('⚠️ Make sure to update PARENT_TOKEN and CHILD_TOKEN with valid JWT tokens');
  
  if (PARENT_TOKEN === 'YOUR_PARENT_JWT_TOKEN_HERE' || CHILD_TOKEN === 'YOUR_CHILD_JWT_TOKEN_HERE') {
    console.error('❌ Please update the JWT tokens in this file before running tests');
    process.exit(1);
  }

  // Start parent client
  const parentSocket = testParentClient();
  testConnectionStatus(parentSocket, 'Parent');

  // Start child client after 3 seconds
  setTimeout(() => {
    const childSocket = testChildClient();
    testConnectionStatus(childSocket, 'Child');
  }, 3000);

  // Cleanup after 20 seconds
  setTimeout(() => {
    console.log('🧹 Cleaning up test connections...');
    process.exit(0);
  }, 20000);
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the tests
runTests();