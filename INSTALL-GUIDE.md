# 📱 Install App on Both Emulators

export ANDROID_SDK_ROOT=~/Library/Android/sdk && export ANDROID_HOME=~/Library/Android/sdk && ~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 -no-snapshot-load &

## ✅ Current Status:
- ✅ Parent emulator (Parent_Device_API_33) is running
- ✅ Child emulator (Pixel_7_API_33) is running on port 5556  
- ✅ Expo server is running and showing QR code

## 🎯 Next Steps:

### 1. In the Expo terminal, you should see:
```
› Press a │ open Android
```

### 2. Install on First Emulator (Parent Device):
- In the Expo terminal, press **`a`** 
- Select **Parent_Device_API_33** from the list
- Wait for app to install and load

### 3. Install on Second Emulator (Child Device):  
- In the Expo terminal, press **`a`** again
- Select **Pixel_7_API_33** from the list
- Wait for app to install and load

### 4. Testing Setup:
- **Parent_Device_API_33**: Create parent account, get pairing code
- **Pixel_7_API_33**: Create child account, use pairing code to connect

## 🔧 If Emulators Don't Show Up:
Check if emulators are fully booted:
```bash
adb devices
```

You should see:
```
emulator-5554    device    (Parent)
emulator-5556    device    (Child)
```

## 🚀 Ready to Test:
Once both apps are installed, you can:
1. Upload videos on parent device
2. Use pause/resume controls  
3. Test next/previous buttons
4. Verify auto-play next functionality

The enhanced video controls with pause/resume and auto-play next are now ready!