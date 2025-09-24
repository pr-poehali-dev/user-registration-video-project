import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface VideoPlayerProps {
  videoUrl: string;
  leadTitle: string;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, leadTitle, className = '' }) => {
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Detect mobile device and browser
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  
  // iOS version detection for better WebM support checking
  const getIOSVersion = () => {
    if (!isIOS) return null;
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)/i);
    return match ? [parseInt(match[1], 10), parseInt(match[2], 10)] : null;
  };
  
  const iosVersion = getIOSVersion();

  useEffect(() => {
    checkVideoSupport();
  }, [videoUrl]);

  const checkVideoSupport = async () => {
    if (!videoUrl) return;

    // Проверяем поддержку разных форматов
    const video = document.createElement('video');
    
    // Определяем формат видео по URL или MIME-типу - теперь только MP4
    const isMP4Video = videoUrl.includes('mp4') || videoUrl.includes('avc') || videoUrl.includes('h264');
    const isWebMVideo = videoUrl.includes('webm'); // Устаревший формат
    
    // Проверим поддержку форматов
    const canPlayMP4 = video.canPlayType('video/mp4') !== '';
    const canPlayWebM = video.canPlayType('video/webm') !== '';
    
    // Для iOS: Поддерживаем только MP4, WebM блокируем
    if (isIOS) {
      if (isWebMVideo) {
        setIsSupported(false);
        toast({
          title: '🚫 Устаревший формат',
          description: 'WebM больше не поддерживается. Все новые записи создаются в MP4.',
          variant: 'destructive'
        });
        return;
      }
      // MP4 должен работать на всех iOS отлично
    }
    
    // For Android Chrome - should work fine
    if (isMobile && isChrome) {
      setIsSupported(true);
      return;
    }
    
    // For desktop Safari - блокируем WebM полностью
    if (isSafari && !isMobile) {
      if (isWebMVideo) {
        setIsSupported(false);
        toast({
          title: '🚫 Формат не поддерживается',
          description: 'WebM формат заблокирован. Система теперь записывает только в MP4.',
          variant: 'destructive'
        });
        return;
      }
    }

    setIsSupported(true);
  };

  const downloadVideo = async () => {
    try {
      setIsLoading(true);
      
      // Convert data URL to blob for proper download
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // Create blob URL and download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Clean filename for download - всегда используем .mp4
      const cleanTitle = leadTitle.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `video_${cleanTitle}.mp4`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);
      
      toast({
        title: 'Скачивание начато',
        description: `Видео "${leadTitle}" загружается`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка скачивания',
        description: 'Не удалось скачать видео',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If video is not supported on this device, show download option
  if (!isSupported) {
    return (
      <div className={`border rounded-lg p-4 text-center bg-muted/30 ${className}`}>
        <Icon name="Smartphone" size={48} className="mx-auto mb-4 text-primary" />
        {isIOS && (
          <>
            <p className="text-sm font-medium mb-2">
              📱 Просмотр на iPhone/iPad
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Это устаревшее WebM видео. Новые записи создаются в MP4 для лучшей совместимости.
            </p>
          </>
        )}
        {isSafari && !isIOS && (
          <>
            <p className="text-sm font-medium mb-2">
              🌐 Safari браузер
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              WebM формат больше не используется. Система теперь записывает только в MP4.
            </p>
          </>
        )}
        {!isIOS && !isSafari && (
          <p className="text-sm text-muted-foreground mb-4">
            Видео не может быть воспроизведено в этом браузере
          </p>
        )}
        <Button onClick={downloadVideo} disabled={isLoading} size="sm" className="mb-2">
          {isLoading ? (
            <Icon name="Loader2" size={16} className="animate-spin mr-2" />
          ) : (
            <Icon name="Download" size={16} className="mr-2" />
          )}
          Скачать видео
        </Button>
        {isIOS && (
          <p className="text-xs text-muted-foreground mt-2">
            💡 После скачивания откройте файл в приложении "Файлы" iOS
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <video 
        ref={videoRef}
        src={videoUrl} 
        controls 
        playsInline // Important for iOS
        preload="metadata"
        className="w-full max-h-64 rounded-lg border"
        style={{ maxWidth: '100%', height: 'auto' }}
        onError={(e) => {
          console.error('Video playback error:', e);
          setIsSupported(false);
          
          let errorMessage = 'Не удалось воспроизвести видео.';
          if (isIOS) {
            errorMessage = 'iOS не поддерживает этот формат видео. Скачайте файл для просмотра.';
          } else if (isSafari) {
            errorMessage = 'Safari не поддерживает WebM. Попробуйте другой браузер или скачайте видео.';
          }
          
          toast({
            title: 'Ошибка воспроизведения',
            description: errorMessage,
            variant: 'destructive'
          });
        }}
      >
        {/* Поддерживаем только MP4 формат */}
        <source src={videoUrl} type="video/mp4" />
        <p className="text-sm text-muted-foreground">
          Ваш браузер не поддерживает воспроизведение видео.
        </p>
      </video>
      
      {/* Additional download button for mobile users */}
      {isMobile && (
        <div className="mt-2 text-center">
          <Button onClick={downloadVideo} disabled={isLoading} size="sm" variant="outline">
            {isLoading ? (
              <Icon name="Loader2" size={14} className="animate-spin mr-2" />
            ) : (
              <Icon name="Download" size={14} className="mr-2" />
            )}
            {isIOS ? 'Сохранить в "Файлы"' : 'Скачать видео'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;