import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface VideoRecorderProps {
  onSaveLead: (videoBlob: Blob, comments: string) => Promise<void>;
  loading: boolean;
  externalUploadProgress?: number;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onSaveLead, loading, externalUploadProgress }) => {
  const [comments, setComments] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // Use external progress if available, otherwise internal progress
  const currentProgress = externalUploadProgress ?? uploadProgress;
  const [isUploading, setIsUploading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 320, max: 320 },
          height: { ideal: 240, max: 240 },
          frameRate: { ideal: 15, max: 15 }
        },
        audio: {
          sampleRate: 22050,
          channelCount: 1
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Принудительно проверяем поддержку MP4 и используем только его
      let options: MediaRecorderOptions = {
        videoBitsPerSecond: 300000,
        audioBitsPerSecond: 32000
      };
      
      // Проверяем поддержку H.264/MP4 кодека
      if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.424028, mp4a.40.2"')) {
        options.mimeType = 'video/mp4; codecs="avc1.424028, mp4a.40.2"';
      } else if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) {
        options.mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
      } else if (MediaRecorder.isTypeSupported('video/mp4; codecs=h264')) {
        options.mimeType = 'video/mp4; codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options.mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        // Временный fallback для тестирования
        options.mimeType = 'video/webm';
        toast({ 
          title: '⚠️ Устаревший формат', 
          description: 'Браузер не поддерживает MP4. Использую WebM временно.', 
          variant: 'destructive' 
        });
      } else {
        // Если ничего не поддерживается, показываем ошибку
        throw new Error('Браузер не поддерживает запись видео');
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', chunks.length);
        console.log('Total chunks size:', chunks.reduce((sum, chunk) => sum + chunk.size, 0));
        // Создаем blob с правильным MIME-типом MP4 (используем mediaRecorder.mimeType)
        const actualMimeType = mediaRecorder.mimeType || 'video/mp4';
        const blob = new Blob(chunks, { type: actualMimeType });
        console.log('Final blob size:', blob.size, 'type:', blob.type);
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(1000); // Собираем данные каждые 1000мс
      setIsRecording(true);
      console.log('MediaRecorder started with mimeType:', mediaRecorder.mimeType);
      toast({ title: 'Запись началась', description: 'Записываем видео с задней камеры' });
    } catch (error: any) {
      let errorMessage = 'Не удалось получить доступ к камере';
      
      if (error.message && error.message.includes('MP4')) {
        errorMessage = 'Ваш браузер не поддерживает запись в формате MP4. Попробуйте использовать Chrome или Safari';
      }
      
      toast({ title: 'Ошибка', description: errorMessage, variant: 'destructive' });
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: 'Запись завершена', description: 'Видео готово к просмотру' });
    }
  };

  const retakeVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    
    // Stop any active camera streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video element source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setVideoBlob(null);
    setVideoUrl('');
    setIsRecording(false);
    toast({ title: 'Готов к пересъемке', description: 'Можете записать новое видео' });
  };

  const handleSaveLead = async () => {
    if (!videoBlob || !comments.trim()) {
      toast({ title: 'Заполните все поля', description: 'Нужно записать видео и добавить комментарий', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    // Check if this will be a chunked upload
    const videoSizeMB = videoBlob.size / (1024 * 1024);
    const isChunkedUpload = videoSizeMB > 8;
    
    let progressInterval: NodeJS.Timeout | null = null;
    
    // For standard upload, simulate progress
    if (!isChunkedUpload) {
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval!);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
    }

    try {
      await onSaveLead(videoBlob, comments);
      
      // Complete progress for standard upload
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      if (!isChunkedUpload) {
        setUploadProgress(100);
      }
      
      // Show success message with checkmark
      toast({ 
        title: '✅ Лид успешно отправлен', 
        description: 'Видео и комментарии сохранены в системе',
        duration: 3000
      });
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setComments('');
        retakeVideo();
      }, 500);
      
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsUploading(false);
      setUploadProgress(0);
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Comments Block - First on mobile */}
      <Card className="animate-scale-in">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Icon name="FileText" size={18} className="sm:w-5 sm:h-5" />
            Комментарии к лиду
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <Textarea
            placeholder="Опишите детали лида, контактную информацию, особые заметки..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            className="resize-none text-sm sm:text-base min-h-[100px] sm:min-h-[120px]"
          />
          
          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {currentProgress > 0 && currentProgress < 100 ? 
                    (externalUploadProgress !== undefined ? 'Загрузка большого файла...' : 'Загрузка видео...') : 
                    'Подготовка к загрузке...'
                  }
                </span>
                <span>{Math.round(currentProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${currentProgress}%` }}
                ></div>
              </div>
              {externalUploadProgress !== undefined && currentProgress > 0 && (
                <div className="text-xs text-gray-500">
                  Многочастная загрузка • Размер файла > 8MB
                </div>
              )}
            </div>
          )}
          
          <Button 
            onClick={handleSaveLead} 
            className="w-full h-12 sm:h-10 text-base sm:text-sm font-medium touch-manipulation"
            disabled={!videoBlob || !comments.trim() || loading || isUploading}
          >
            {loading || isUploading ? (
              <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
            ) : (
              <Icon name="Save" size={16} className="mr-2" />
            )}
            {isUploading ? 'Загружаем...' : 'Сохранить лид'}
          </Button>
        </CardContent>
      </Card>

      {/* Video Recording Block - Second on mobile */}
      <Card className="animate-scale-in">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Icon name="Camera" size={18} className="sm:w-5 sm:h-5" />
            Контроль качества
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative touch-manipulation">
            {/* Hidden recording video element */}
            {!videoUrl && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover opacity-0 absolute inset-0 pointer-events-none"
              />
            )}
            
            {/* Fake cover - visible during recording */}
            {!videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <h1 className="text-black font-bold text-xl sm:text-2xl md:text-4xl select-none px-4 text-center">IMPERIA PROMO</h1>
              </div>
            )}
            
            {/* Playback video when available - replaces cover */}
            {videoUrl && (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Show placeholder when no video */}
            {!isRecording && !videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-5">
                <div className="text-center px-4">
                  <Icon name="Camera" size={40} className="mx-auto mb-2 text-gray-400 sm:w-12 sm:h-12" />
                  <p className="text-gray-500 text-sm sm:text-base">Нажмите "Начать запись"</p>
                </div>
              </div>
            )}
            

          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
            {!isRecording && !videoUrl && (
              <Button onClick={startVideoRecording} className="flex-1 h-12 sm:h-10 text-base sm:text-sm font-medium touch-manipulation">
                <Icon name="Play" size={16} className="mr-2" />
                Начать запись
              </Button>
            )}
            
            {isRecording && (
              <Button onClick={stopVideoRecording} variant="destructive" className="flex-1 h-12 sm:h-10 text-base sm:text-sm font-medium touch-manipulation">
                <Icon name="Square" size={16} className="mr-2" />
                Остановить
              </Button>
            )}
            
            {videoUrl && (
              <Button onClick={retakeVideo} variant="outline" className="flex-1 h-12 sm:h-10 text-base sm:text-sm font-medium touch-manipulation">
                <Icon name="RefreshCw" size={16} className="mr-2" />
                Пересъемка
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoRecorder;