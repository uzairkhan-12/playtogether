const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for asset registry issues with expo-router
config.resolver = {
  ...config.resolver,
  assetExts: [
    ...config.resolver.assetExts,
    'png',
    'jpg',
    'jpeg',
    'gif',
    'svg',
    'mp4',
    'webm',
    'mov',
    'avi'
  ],
};

module.exports = config;
