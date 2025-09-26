import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, MediaCapture } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

interface NativeCameraHook {
  isNative: boolean;
  recordVideo: () => Promise<Blob | null>;
  takePhoto: () => Promise<string | null>;
  isRecording: boolean;
  error: string | null;
}

export const useNativeCamera = (): NativeCameraHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isNative = Capacitor.isNativePlatform();

  const recordVideo = useCallback(async (): Promise<Blob | null> => {
    if (!isNative) {
      // Fallback to web implementation
      return null;
    }

    try {
      setIsRecording(true);
      setError(null);

      // Check device info
      const deviceInfo = await Device.getInfo();
      console.log('🔥 Recording on native platform:', deviceInfo.platform);

      // Use Capacitor Community Media plugin for video recording
      const { MediaCapture } = await import('@capacitor-community/media');
      
      const videoOptions = {
        quality: 'high' as const,
        duration: 300, // 5 minutes max
        saveToPhotoAlbum: true
      };

      const video = await MediaCapture.captureVideo(videoOptions);
      console.log('📹 Video recorded:', video);

      if (video && video.fullPath) {
        // Read the video file as blob
        const videoFile = await Filesystem.readFile({
          path: video.fullPath
        });

        // Convert base64 to blob
        const base64Data = videoFile.data as string;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'video/mp4' });
        
        return blob;
      }

      return null;
    } catch (err: any) {
      console.error('❌ Native video recording error:', err);
      setError(err.message || 'Failed to record video');
      return null;
    } finally {
      setIsRecording(false);
    }
  }, [isNative]);

  const takePhoto = useCallback(async (): Promise<string | null> => {
    if (!isNative) {
      return null;
    }

    try {
      setError(null);
      
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      return photo.webPath || null;
    } catch (err: any) {
      console.error('❌ Native photo error:', err);
      setError(err.message || 'Failed to take photo');
      return null;
    }
  }, [isNative]);

  return {
    isNative,
    recordVideo,
    takePhoto,
    isRecording,
    error
  };
};