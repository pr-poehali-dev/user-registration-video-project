import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useNativeCamera } from '@/hooks/useNativeCamera';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

interface NativeVideoRecorderProps {
  onVideoRecorded: (blob: Blob) => void;
  onError: (error: string) => void;
}

const NativeVideoRecorder: React.FC<NativeVideoRecorderProps> = ({ 
  onVideoRecorded, 
  onError 
}) => {
  const { isNative, recordVideo, isRecording, error } = useNativeCamera();
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeNativeFeatures = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Hide splash screen
          await SplashScreen.hide();
          
          // Set status bar
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#3B82F6' });
          
          console.log('🚀 Native platform initialized');
          setIsInitialized(true);
        } catch (err) {
          console.error('❌ Native initialization error:', err);
        }
      } else {
        setIsInitialized(true);
      }
    };

    initializeNativeFeatures();
  }, []);

  useEffect(() => {
    if (error) {
      onError(error);
      toast({
        title: 'Ошибка записи',
        description: error,
        variant: 'destructive'
      });
    }
  }, [error, onError, toast]);

  const handleRecordVideo = async () => {
    try {
      toast({
        title: '📹 Запись видео',
        description: 'Начинаем запись с камеры устройства...'
      });

      const videoBlob = await recordVideo();
      
      if (videoBlob) {
        onVideoRecorded(videoBlob);
        toast({
          title: '✅ Видео записано!',
          description: `Размер: ${(videoBlob.size / (1024 * 1024)).toFixed(2)} MB`
        });
      } else {
        throw new Error('Не удалось записать видео');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Ошибка записи видео';
      onError(errorMessage);
      toast({
        title: '❌ Ошибка',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Инициализация камеры...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isNative && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Icon name="Smartphone" size={20} className="text-green-600" />
            <div>
              <h4 className="text-sm font-medium text-green-800">Нативное приложение</h4>
              <p className="text-xs text-green-600">
                Используется камера устройства с высоким качеством записи
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-64 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Icon name="Video" size={48} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">
                {isNative ? 'Нативная камера готова' : 'Веб-камера'}
              </p>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleRecordVideo}
          disabled={isRecording}
          size="lg"
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
        >
          {isRecording ? (
            <>
              <Icon name="Square" size={20} className="mr-2" />
              Остановить запись
            </>
          ) : (
            <>
              <Icon name="VideoIcon" size={20} className="mr-2" />
              {isNative ? 'Записать видео (HD)' : 'Записать видео'}
            </>
          )}
        </Button>

        {isNative && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Максимум 5 минут записи</p>
            <p>• Высокое качество (HD/4K)</p>
            <p>• Автосохранение в галерею</p>
            <p>• Фоновая загрузка на сервер</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NativeVideoRecorder;