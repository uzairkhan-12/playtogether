# PlayTogether - Simple Setup

## 🚀 Quick Start (3 Steps)

### Step 1: Start Backend Server
```bash
cd server
npm start
```

### Step 2: Start Two Emulators
**Terminal 1 - Parent Device:**
```bash
~/Library/Android/sdk/emulator/emulator -avd Parent_Device_API_33
```

**Terminal 2 - Child Device:**
```bash
~/Library/Android/sdk/emulator/emulator -avd Pixel_7_API_33 -port 5556
```

### Step 3: Start Expo
```bash
cd app
npx expo start --clear
```

Then press `a` twice in Expo terminal to install on both emulators.

## 📱 Available Emulators
- `Parent_Device_API_33` (use as Parent)
- `Pixel_7_API_33` (use as Child)
- `Medium_Phone_API_36.1` (backup)

## 🎯 Testing Workflow
1. Create parent account on Parent_Device_API_33
2. Create child account on Pixel_7_API_33
3. Use pairing code to connect devices
4. Test video upload and playback

## 🛑 Stop Everything
```bash
# Kill emulators
pkill -f emulator

# Stop servers with Ctrl+C in their terminals
```

That's it! Keep it simple.