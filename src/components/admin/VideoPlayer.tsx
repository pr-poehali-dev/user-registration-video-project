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
  const [convertedUrl, setConvertedUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    checkVideoSupport();
  }, [videoUrl]);

  const checkVideoSupport = async () => {
    if (!videoUrl) return;

    // For iOS Safari, we need to check WebM support more carefully
    if (isIOS || (isSafari && isMobile)) {
      const video = document.createElement('video');
      const canPlayWebM = video.canPlayType('video/webm') !== '';
      
      if (!canPlayWebM) {
        setIsSupported(false);
        toast({
          title: 'Формат видео',
          description: 'На вашем устройстве WebM может не поддерживаться. Попробуйте скачать видео.',
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
      const extension = isSupported ? 'webm' : 'mp4';
      link.download = `video_${cleanTitle}.${extension}`;
      
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
      <div className={`border rounded-lg p-4 text-center ${className}`}>
        <Icon name="Video" size={48} className="mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          Видео не может быть воспроизведено на вашем устройстве
        </p>
        <Button onClick={downloadVideo} disabled={isLoading} size="sm">
          {isLoading ? (
            <Icon name="Loader2" size={16} className="animate-spin mr-2" />
          ) : (
            <Icon name="Download" size={16} className="mr-2" />
          )}
          Скачать видео
        </Button>
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
          toast({
            title: 'Ошибка воспроизведения',
            description: 'Не удалось воспроизвести видео. Попробуйте скачать его.',
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
            Скачать видео
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;