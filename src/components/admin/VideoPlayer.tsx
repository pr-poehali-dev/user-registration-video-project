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

    // For iOS, check version and WebM support
    if (isIOS) {
      const video = document.createElement('video');
      const canPlayWebM = video.canPlayType('video/webm') !== '';
      const canPlayWebMCodecs = video.canPlayType('video/webm; codecs="vp8"') !== '';
      
      // iOS 15+ has better WebM support, but still limited
      const hasWebMSupport = canPlayWebM && canPlayWebMCodecs;
      
      if (!hasWebMSupport || (iosVersion && iosVersion[0] < 15)) {
        setIsSupported(false);
        toast({
          title: '📱 iOS устройство',
          description: 'Видео лучше скачать для просмотра в стандартном плеере iOS.',
          variant: 'default'
        });
        return;
      }
    }
    
    // For Android Chrome - should work fine
    if (isMobile && isChrome) {
      setIsSupported(true);
      return;
    }
    
    // For desktop Safari
    if (isSafari && !isMobile) {
      const video = document.createElement('video');
      const canPlayWebM = video.canPlayType('video/webm') !== '';
      
      if (!canPlayWebM) {
        setIsSupported(false);
        toast({
          title: 'Safari браузер',
          description: 'WebM может не поддерживаться в этой версии Safari. Рекомендуем скачать видео.',
          variant: 'default'
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
      
      // Clean filename for download
      const cleanTitle = leadTitle.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `video_${cleanTitle}.webm`;
      
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
              Скачайте видео для просмотра в стандартном плеере iOS с лучшим качеством.
            </p>
          </>
        )}
        {isSafari && !isIOS && (
          <>
            <p className="text-sm font-medium mb-2">
              🌐 Safari браузер
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              WebM формат может не поддерживаться. Скачайте видео или откройте в Chrome.
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
          Скачать видео (.webm)
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
        <source src={videoUrl} type="video/webm" />
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