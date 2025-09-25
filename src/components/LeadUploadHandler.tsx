import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChunkedUploader } from '@/utils/chunkedUpload';

interface UploadProgressData {
  progress: number;
  uploadedMB: number;
  totalMB: number;
  uploadType: 'standard' | 'chunked';
}

interface LeadUploadHandlerProps {
  token: string;
  apiUrls: {
    leads: string;
    chunkedUpload: string;
  };
  onProgress: (progress: number | undefined) => void;
  onUploadData: (data: UploadProgressData | null) => void;
  onLoadLeads: (token: string) => Promise<void>;
}

export const useLeadUploadHandler = ({ 
  token, 
  apiUrls, 
  onProgress, 
  onUploadData,
  onLoadLeads 
}: LeadUploadHandlerProps) => {
  const { toast } = useToast();

  const handleChunkedUpload = async (videoBlob: Blob, comments: string): Promise<void> => {
    const totalMB = videoBlob.size / (1024 * 1024);
    
    // Optimize chunk size for Android Chrome and mobile devices
    const isAndroidDevice = /Android/i.test(navigator.userAgent);
    const isAndroidChrome = isAndroidDevice && /Chrome/i.test(navigator.userAgent);
    const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
    
    // Smaller chunks for better memory management on mobile
    let chunkSize = 5 * 1024 * 1024; // 5MB default
    if (isAndroidChrome) {
      chunkSize = 1 * 1024 * 1024; // 1MB for Android Chrome
    } else if (isMobileDevice) {
      chunkSize = 2 * 1024 * 1024; // 2MB for other mobile
    }
    
    console.log(`Using chunked upload with ${(chunkSize / (1024 * 1024)).toFixed(1)}MB chunks for ${isAndroidChrome ? 'Android Chrome' : isMobileDevice ? 'mobile' : 'desktop'}`);
    
    const uploader = new ChunkedUploader({
      file: videoBlob,
      title: `Лид от ${new Date().toLocaleDateString('ru-RU')}`,
      comments: comments,
      token: token,
      uploadUrl: apiUrls.chunkedUpload,
      chunkSize: chunkSize,
      onProgress: (progress) => {
        onProgress(progress);
        const uploadedMB = (progress / 100) * totalMB;
        onUploadData({
          progress,
          uploadedMB,
          totalMB,
          uploadType: 'chunked'
        });
        console.log(`Upload progress: ${progress.toFixed(1)}% (${uploadedMB.toFixed(1)}/${totalMB.toFixed(1)} МБ)`);
      },
      onChunkUploaded: (chunk, total) => {
        console.log(`Chunk ${chunk}/${total} uploaded`);
      },
      onComplete: async (result) => {
        console.log('Chunked upload completed:', result);
        onProgress(100);
        onUploadData({
          progress: 100,
          uploadedMB: totalMB,
          totalMB,
          uploadType: 'chunked'
        });
        
        // Reload leads and cleanup
        await onLoadLeads(token);
        setTimeout(() => {
          onProgress(undefined);
          onUploadData(null);
        }, 500);
      },
      onError: (error) => {
        console.error('Chunked upload error:', error);
        onProgress(undefined);
        onUploadData(null);
        
        toast({ 
          title: 'Ошибка загрузки большого файла', 
          description: error, 
          variant: 'destructive' 
        });
        throw new Error(error);
      }
    });

    await uploader.upload();
  };

  const handleStandardUpload = async (videoBlob: Blob, comments: string): Promise<void> => {
    const totalMB = videoBlob.size / (1024 * 1024);
    
    // For Android Chrome, use chunked upload for files > 2MB to avoid memory issues
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    
    if (isAndroid && isChrome && totalMB > 2) {
      console.log('Android Chrome detected, using chunked upload for', totalMB.toFixed(1), 'MB file');
      return await handleChunkedUpload(videoBlob, comments);
    }
    
    // Simulate progress for standard upload
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      if (simulatedProgress < 90) {
        simulatedProgress += Math.random() * 15;
        onProgress(simulatedProgress);
        onUploadData({
          progress: simulatedProgress,
          uploadedMB: (simulatedProgress / 100) * totalMB,
          totalMB,
          uploadType: 'standard'
        });
      }
    }, 300);
    
    try {
      // Convert video blob to base64 with memory optimization for mobile
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        console.log('FileReader result length:', result.length);
        console.log('FileReader result prefix:', result.substring(0, 100));
        
        // Найдем позицию base64 данных после "base64,"
        const base64Index = result.indexOf('base64,');
        if (base64Index === -1) {
          console.error('Base64 marker not found in result');
          throw new Error('Base64 marker not found in result');
        }
        
        const base64Video = result.substring(base64Index + 7); // Skip "base64," (7 chars)
        console.log('Video blob type:', videoBlob.type);
        console.log('Video blob size:', videoBlob.size);
        console.log('Base64 length after split:', base64Video.length);
        
        if (!base64Video || base64Video.length === 0) {
          console.error('Base64 conversion failed - empty result');
          toast({ 
            title: 'Ошибка кодирования видео', 
            description: 'Не удалось преобразовать видео в base64', 
            variant: 'destructive' 
          });
          throw new Error('Base64 conversion failed');
        }
        
        console.log('Starting POST request to:', apiUrls.leads);
        console.log('Token length:', token.length);
        console.log('Comments:', comments);
        console.log('Base64 video length:', base64Video.length);
        
        // Check file size limits  
        const videoSizeMB = videoBlob.size / (1024 * 1024);
        const base64SizeMB = (base64Video.length * 3) / (4 * 1024 * 1024); // base64 is ~33% larger
        console.log('Video blob size:', videoBlob.size, 'bytes (', videoSizeMB.toFixed(2), 'MB)');
        console.log('Base64 size estimate:', base64SizeMB.toFixed(2), 'MB');
        
        // Check device and decide upload strategy
        const isAndroidDevice = /Android/i.test(navigator.userAgent);
        const isAndroidChrome = isAndroidDevice && /Chrome/i.test(navigator.userAgent);
        const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
        
        console.log('Device info - Android:', isAndroidDevice, 'Chrome:', /Chrome/i.test(navigator.userAgent), 'Mobile:', isMobileDevice);
        console.log('File size:', videoSizeMB.toFixed(2), 'MB');
        
        // Use chunked upload for Android Chrome files >2MB OR any mobile files >5MB
        const shouldUseChunkedUpload = (isAndroidChrome && videoSizeMB > 2) || (isMobileDevice && videoSizeMB > 5);
        
        if (shouldUseChunkedUpload) {
          console.log('Using chunked upload for large mobile file');
          return await handleChunkedUpload(videoBlob, comments);
        }
        
        // Standard upload for smaller files
        console.log('Using standard upload');
        const requestBody = {
          title: `Лид от ${new Date().toLocaleDateString('ru-RU')}`,
          comments: comments,
          video_data: base64Video,
          video_filename: 'recording.mp4',
          video_content_type: 'video/mp4'
        };
        
        console.log('Request body keys:', Object.keys(requestBody));
        
        // Create fetch with longer timeout for mobile devices  
        const controller = new AbortController();
        const timeoutDuration = isMobileDevice ? 90000 : 45000; // 90 seconds for mobile, 45 for desktop
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
        
        console.log('Sending POST request with timeout:', timeoutDuration / 1000, 'seconds');
        
        const response = await fetch(apiUrls.leads, {
          method: 'POST',
          headers: {
            'X-Auth-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        console.log('POST request completed, response received');
        
        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response text that failed to parse:', responseText);
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
        }
        
        if (response.ok && data.success) {
          // Complete progress
          clearInterval(progressInterval);
          onProgress(100);
          onUploadData({
            progress: 100,
            uploadedMB: totalMB,
            totalMB,
            uploadType: 'standard'
          });
          
          // Reload leads
          await onLoadLeads(token);
        } else {
          clearInterval(progressInterval);
          toast({ 
            title: 'Ошибка сохранения', 
            description: data.error || 'Не удалось сохранить лид', 
            variant: 'destructive' 
          });
          throw new Error(data.error || 'Не удалось сохранить лид');
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        clearInterval(progressInterval);
        toast({ 
          title: 'Ошибка чтения файла', 
          description: 'Не удалось прочитать видео файл', 
          variant: 'destructive' 
        });
        throw new Error('FileReader error');
      };
      
      reader.readAsDataURL(videoBlob);
    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Не удалось сохранить лид';
      
      if (error.name === 'AbortError') {
        const isMobileForError = /Mobi|Android/i.test(navigator.userAgent);
        const timeoutSecs = isMobileForError ? 60 : 30;
        errorMessage = `Превышено время ожидания (${timeoutSecs} сек). На мобильных устройствах попробуйте уменьшить размер видео.`;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Ошибка сети. Проверьте интернет-соединение или попробуйте записать более короткое видео.';
      } else if (error.message.includes('Invalid JSON')) {
        errorMessage = 'Сервер вернул некорректный ответ. Возможно, файл слишком большой для загрузки.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышено время ожидания. Попробуйте записать более короткое видео.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Ошибка загрузки. На Android может помочь запись более короткого видео (до 30 сек).';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Mobile-optimized error handling:', errorMessage);
      
      clearInterval(progressInterval);
      toast({ 
        title: 'Ошибка', 
        description: errorMessage, 
        variant: 'destructive' 
      });
      throw new Error(errorMessage);
    }
  };

  const handleSaveLead = async (videoBlob: Blob, comments: string) => {
    const videoSizeMB = videoBlob.size / (1024 * 1024);
    console.log('Video file size:', videoSizeMB.toFixed(2), 'MB');
    
    // Detect mobile devices
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    
    console.log('Device detection - Android:', isAndroid, 'Mobile:', isMobile);
    
    // Detect Android Chrome specifically
    const isAndroidChrome = isAndroid && /Chrome/i.test(navigator.userAgent);
    
    // Use chunked upload for:
    // - Files larger than 8MB (desktop)
    // - Files larger than 1MB on Android Chrome (severe memory issues)
    // - Files larger than 2MB on other Android devices  
    // - Files larger than 5MB on other mobile devices
    const shouldUseChunked = videoSizeMB > 8 || 
                           (isAndroidChrome && videoSizeMB > 1) ||
                           (isAndroid && videoSizeMB > 2) || 
                           (isMobile && videoSizeMB > 5);
    
    console.log('Upload decision - Size:', videoSizeMB.toFixed(1), 'MB, Android:', isAndroid, 'AndroidChrome:', isAndroidChrome, 'Mobile:', isMobile, 'UseChunked:', shouldUseChunked);
    
    if (shouldUseChunked) {
      console.log('🔄 Using chunked upload for', isAndroidChrome ? 'Android Chrome' : (isAndroid ? 'Android' : 'mobile'), 'device');
      await handleChunkedUpload(videoBlob, comments);
    } else {
      console.log('📤 Using standard upload');
      await handleStandardUpload(videoBlob, comments);
    }
  };

  return {
    handleSaveLead
  };
};