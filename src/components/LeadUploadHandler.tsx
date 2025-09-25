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
    
    const uploader = new ChunkedUploader({
      file: videoBlob,
      title: `Лид от ${new Date().toLocaleDateString('ru-RU')}`,
      comments: comments,
      token: token,
      uploadUrl: apiUrls.chunkedUpload,
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
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
      // Convert video blob to base64
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
        
        // Warn if approaching limits
        if (videoSizeMB > 8) {
          console.warn('Video size approaching Cloud Function limits!');
          toast({ 
            title: '⚠️ Большой размер видео', 
            description: `Размер: ${videoSizeMB.toFixed(1)}MB. Это может вызвать проблемы с загрузкой.`, 
            variant: 'destructive' 
          });
        }
        
        const requestBody = {
          title: `Лид от ${new Date().toLocaleDateString('ru-RU')}`,
          comments: comments,
          video_data: base64Video,
          video_filename: 'recording.mp4',
          video_content_type: 'video/mp4'
        };
        
        console.log('Request body keys:', Object.keys(requestBody));
        
        // Create fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(apiUrls.leads, {
          method: 'POST',
          headers: {
            'X-Auth-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
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
        errorMessage = 'Превышено время ожидания (30 сек) - попробуйте еще раз';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Ошибка сети - проверьте подключение к интернету';
      } else if (error.message.includes('Invalid JSON')) {
        errorMessage = 'Сервер вернул некорректный ответ';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышено время ожидания - попробуйте еще раз';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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
    
    // Use chunked upload for files larger than 8MB
    if (videoSizeMB > 8) {
      console.log('Using chunked upload for large file');
      await handleChunkedUpload(videoBlob, comments);
    } else {
      console.log('Using standard upload for small file');
      await handleStandardUpload(videoBlob, comments);
    }
  };

  return {
    handleSaveLead
  };
};