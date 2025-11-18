import { useState, useEffect, useCallback } from 'react';

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  thumbnailUrl?: string;
  url: string;
  uploadedAt: string;
  playCount: number;
  fileSize: number;
  format: string;
  uploadStatus: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
}

interface UseVideoPlaylistProps {
  videos: Video[];
  socket: any;
  isConnected: boolean;
  childConnected: boolean;
  onVideoChange?: (video: Video | null) => void;
}

interface PlaybackStatus {
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  duration: number;
}

export const useVideoPlaylist = ({
  videos,
  socket,
  isConnected,
  childConnected,
  onVideoChange,
}: UseVideoPlaylistProps) => {
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>({
    isPlaying: false,
    currentTime: 0,
    volume: 100,
    duration: 0,
  });
  const [volume, setVolume] = useState(100);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Update current index when video changes
  useEffect(() => {
    if (currentVideo) {
      const index = videos.findIndex(video => video._id === currentVideo._id);
      setCurrentIndex(index);
    } else {
      setCurrentIndex(-1);
    }
  }, [currentVideo, videos]);

  // Removed auto-play next functionality - only manual control now

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handlePlaybackStatus = (data: any) => {
      const newStatus = {
        isPlaying: data.isPlaying,
        currentTime: data.currentTime,
        volume: data.volume,
        duration: data.duration || playbackStatus.duration,
      };
      
      setPlaybackStatus(newStatus);
      
      // Check if video has ended (with 2 second buffer for better detection)
      const isNearEnd = newStatus.duration > 0 && newStatus.currentTime >= newStatus.duration - 2;
      const isAtEnd = newStatus.duration > 0 && newStatus.currentTime >= newStatus.duration;
      const hasVideoEnded = isAtEnd || (isNearEnd && !newStatus.isPlaying);
      
      if (hasVideoEnded && currentVideo) {
        console.log('🎬 Video ended:', currentVideo.title);
        console.log('📝 Video ended - no auto-play, only manual controls or repeat on child device');
      }

    };

    socket.on('child_playback_status', handlePlaybackStatus);

    return () => {
      socket.off('child_playback_status', handlePlaybackStatus);
    };
  }, [socket, playbackStatus.duration]);

  const canControl = isConnected && childConnected && socket;

  const playVideo = useCallback((video: Video) => {
    if (!canControl) {
      console.log('❌ Cannot play video - device offline or not connected');
      return;
    }

    // Stop current video if playing
    if (currentVideo) {
      socket.emit('video_stop', { videoId: currentVideo._id });
    }
    
    // Play new video
    socket.emit('video_play', { videoId: video._id, currentTime: 0 });
    setCurrentVideo(video);
    setVolume(100);
    setIsFullscreen(false); // Always start in portrait mode
    setPlaybackStatus(prev => ({ 
      ...prev, 
      duration: video.duration, 
      isPlaying: true,
      currentTime: 0,
    }));
    
    onVideoChange?.(video);
    console.log(`🎵 Playing video: ${video.title}`);
  }, [canControl, currentVideo, socket, onVideoChange]);

  const pauseVideo = useCallback(() => {
    if (!canControl || !currentVideo) return;
    
    socket.emit('video_pause', {
      videoId: currentVideo._id,
      currentTime: playbackStatus.currentTime
    });
    
    // Update local state immediately for responsive UI
    setPlaybackStatus(prev => ({ ...prev, isPlaying: false }));
    console.log('⏸️ Video paused at', playbackStatus.currentTime);
  }, [canControl, currentVideo, socket, playbackStatus.currentTime]);

  const resumeVideo = useCallback(() => {
    if (!canControl || !currentVideo) return;
    
    socket.emit('video_play', {
      videoId: currentVideo._id,
      currentTime: playbackStatus.currentTime
    });
    
    // Update local state immediately for responsive UI
    setPlaybackStatus(prev => ({ ...prev, isPlaying: true }));
    console.log('▶️ Video resumed from', playbackStatus.currentTime);
  }, [canControl, currentVideo, socket, playbackStatus.currentTime]);

  const stopVideo = useCallback(() => {
    if (!socket || !currentVideo) return;
    
    socket.emit('video_stop', { videoId: currentVideo._id });
    setCurrentVideo(null);
    setIsFullscreen(false); // Reset fullscreen state when video stops
    setPlaybackStatus({
      isPlaying: false,
      currentTime: 0,
      volume: 100,
      duration: 0,
    });
    
    onVideoChange?.(null);
    console.log('⏹️ Video stopped');
  }, [socket, currentVideo, onVideoChange]);

  const playNext = useCallback(() => {
    if (currentIndex >= videos.length - 1) {
      console.log('📝 No next video available');
      return;
    }
    
    const nextVideo = videos[currentIndex + 1];
    playVideo(nextVideo);
    console.log(`⏭️ Playing next video: ${nextVideo.title}`);
  }, [currentIndex, videos, playVideo]);

  const playPrevious = useCallback(() => {
    if (currentIndex <= 0) {
      console.log('📝 No previous video available');
      return;
    }
    
    const prevVideo = videos[currentIndex - 1];
    playVideo(prevVideo);
    console.log(`⏮️ Playing previous video: ${prevVideo.title}`);
  }, [currentIndex, videos, playVideo]);

  const changeVolume = useCallback((newVolume: number) => {
    if (!canControl || !currentVideo) return;
    
    setVolume(newVolume);
    socket.emit('video_volume', {
      videoId: currentVideo._id,
      volume: Math.round(newVolume)
    });
    console.log(`🔊 Volume changed to ${Math.round(newVolume)}%`);
  }, [canControl, currentVideo, socket]);

  const seekVideo = useCallback((seekTime: number) => {
    if (!canControl || !currentVideo) return;
    
    socket.emit('video_seek', {
      videoId: currentVideo._id,
      seekTime
    });
    console.log(`⏩ Seeking to ${seekTime}s`);
  }, [canControl, currentVideo, socket]);

  const togglePlayPause = useCallback(() => {
    if (playbackStatus.isPlaying) {
      pauseVideo();
    } else {
      resumeVideo();
    }
  }, [playbackStatus.isPlaying, pauseVideo, resumeVideo]);

  const toggleFullscreen = useCallback(() => {
    if (!canControl || !currentVideo) return;
    
    socket.emit('video_fullscreen', {
      videoId: currentVideo._id,
      fullscreen: !isFullscreen
    });
    
    setIsFullscreen(!isFullscreen);
    console.log(`📱 Toggling fullscreen to: ${!isFullscreen}`);
  }, [canControl, currentVideo, socket, isFullscreen]);

  const toggleRepeat = useCallback(() => {
    if (!canControl) return;
    
    const newRepeatState = !isRepeat;
    setIsRepeat(newRepeatState);
    
    // Emit repeat state to child device
    if (socket && currentVideo) {
      socket.emit('video_repeat', {
        videoId: currentVideo._id,
        repeat: newRepeatState
      });
    }
    
    console.log(`🔁 Toggling repeat to: ${newRepeatState}`);
  }, [canControl, isRepeat, socket, currentVideo]);

  return {
    // State
    currentVideo,
    currentIndex,
    playbackStatus,
    volume,
    autoPlayNext,
    canControl,
    isFullscreen,
    isRepeat,
    
    // Computed
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < videos.length - 1,
    
    // Actions
    playVideo,
    pauseVideo,
    resumeVideo,
    stopVideo,
    playNext,
    playPrevious,
    changeVolume,
    seekVideo,
    togglePlayPause,
    toggleFullscreen,
    toggleRepeat,
    setAutoPlayNext,
  };
};