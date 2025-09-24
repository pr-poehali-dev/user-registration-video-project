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
    setVideoBlob(null);
    setVideoUrl('');
    toast({ title: 'Готов к пересъемке', description: 'Можете записать новое видео' });
  };

  const handleSaveLead = async () => {
    if (!videoBlob || !comments.trim()) {
      toast({ title: 'Заполните все поля', description: 'Нужно записать видео и добавить комментарий', variant: 'destructive' });
      return;
    }

    await onSaveLead(videoBlob, comments);
    
    // Clear form after successful save
    setComments('');
    retakeVideo();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Video Recording Block */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Camera" size={20} />
            Запись видео
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
            {!videoUrl ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
              />
            )}
            
            {!isRecording && !videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Icon name="Camera" size={48} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Нажмите "Начать запись"</p>
                </div>
              </div>
            )}
            
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">REC</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
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

      {/* Comments Block */}
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
            rows={8}
            className="resize-none"
          />
          
          <Button 
            onClick={handleSaveLead} 
            className="w-full bg-success hover:bg-success/90"
            disabled={!videoBlob || !comments.trim() || loading}
          >
            {loading ? (
              <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
            ) : (
              <Icon name="Save" size={16} className="mr-2" />
            )}
            Сохранить лид
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoRecorder;