import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface VideoRecorderProps {
  onSaveLead: (videoBlob: Blob, comments: string) => Promise<void>;
  loading: boolean;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onSaveLead, loading }) => {
  const [comments, setComments] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
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

      const mediaRecorder = new MediaRecorder(stream, {
        videoBitsPerSecond: 300000,
        audioBitsPerSecond: 32000
      });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: 'Запись началась', description: 'Записываем видео с задней камеры' });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось получить доступ к камере', variant: 'destructive' });
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
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      await onSaveLead(videoBlob, comments);
      
      // Complete progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setComments('');
        retakeVideo();
      }, 500);
      
    } catch (error) {
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(0);
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Comments Block - First on mobile */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="FileText" size={20} />
            Комментарии к лиду
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Опишите детали лида, контактную информацию, особые заметки..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={6}
            className="resize-none"
          />
          
          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Загрузка видео...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleSaveLead} 
            className="w-full"
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Camera" size={20} />
            Контроль качества
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
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
              <div className="absolute inset-0 flex items-center justify-center bg-gray-400 z-10">
                <h1 className="text-black font-bold text-2xl md:text-4xl select-none">IMPERIA PROMO</h1>
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
                <div className="text-center">
                  <Icon name="Camera" size={48} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Нажмите "Начать запись"</p>
                </div>
              </div>
            )}
            

          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {!isRecording && !videoUrl && (
              <Button onClick={startVideoRecording} className="flex-1">
                <Icon name="Play" size={16} className="mr-2" />
                Начать запись
              </Button>
            )}
            
            {isRecording && (
              <Button onClick={stopVideoRecording} variant="destructive" className="flex-1">
                <Icon name="Square" size={16} className="mr-2" />
                Остановить
              </Button>
            )}
            
            {videoUrl && (
              <Button onClick={retakeVideo} variant="outline" className="flex-1">
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