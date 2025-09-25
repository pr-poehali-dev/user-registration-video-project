import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface UploadPageProps {
  onNewLead: () => void;
  onSaveLead: (videoBlob: Blob, comments: string) => Promise<void>;
  videoBlob: Blob | null;
  comments: string;
  uploadedMB?: number;
  totalMB?: number;
  uploadType?: 'standard' | 'chunked';
  progress?: number;
}

type UploadPhase = 'uploading' | 'success' | 'error';

const UploadPage: React.FC<UploadPageProps> = ({ 
  onNewLead,
  onSaveLead,
  videoBlob,
  comments,
  uploadedMB = 0,
  totalMB = 0,
  uploadType = 'standard',
  progress = 0
}) => {
  const [phase, setPhase] = useState<UploadPhase>('uploading');
  const [error, setError] = useState<string>('');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(true);

  useEffect(() => {
    if (videoBlob && comments) {
      handleUpload();
    }
  }, [videoBlob, comments]);

  useEffect(() => {
    if (progress !== undefined) {
      setCurrentProgress(progress);
    }
  }, [progress]);

  const handleUpload = async () => {
    if (!videoBlob || !comments) return;
    
    try {
      setPhase('uploading');
      setError('');
      
      // Start upload
      await onSaveLead(videoBlob, comments);
      
      // Show success after a brief delay to see final progress
      setTimeout(() => {
        setPhase('success');
        setShowProgressBar(false);
      }, 800);
      
    } catch (err: any) {
      setPhase('error');
      setError(err.message || 'Не удалось загрузить лид');
      setShowProgressBar(false);
    }
  };

  const handleRetry = () => {
    setShowProgressBar(true);
    setCurrentProgress(0);
    handleUpload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {phase === 'uploading' && (
            <div className="text-center space-y-6">
              {/* Animated Upload Icon */}
              <div className="w-24 h-24 mx-auto relative">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon name="Upload" size={36} className="text-blue-600" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-800">
                  Загружаем лид...
                </h2>
                <p className="text-sm text-gray-600">
                  Видео отправляется на сервер
                </p>
              </div>

              {showProgressBar && totalMB > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      {uploadType === 'chunked' ? 'Многочастная загрузка' : 'Загрузка видео'}
                    </span>
                    <span>
                      {totalMB > 0 ? 
                        `${uploadedMB.toFixed(1)} / ${totalMB.toFixed(1)} МБ` : 
                        `${Math.round(currentProgress)}%`
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${currentProgress}%` }}
                    ></div>
                  </div>
                  {totalMB > 0 && (
                    <div className="text-xs text-gray-500 text-center">
                      {uploadType === 'chunked' ? 
                        `Файл разбит на части по 5 МБ • Общий размер: ${totalMB.toFixed(1)} МБ` :
                        `Размер файла: ${totalMB.toFixed(1)} МБ`
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {phase === 'success' && (
            <div className="text-center space-y-6">
              {/* Animated Success Check */}
              <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-green-600 rounded-full animate-ping opacity-20"></div>
                <Icon name="CheckCircle" size={48} className="text-green-600 animate-bounce" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-800">
                  Лид успешно отправлен!
                </h2>
                <p className="text-sm text-gray-600">
                  Видео и комментарии сохранены в системе
                </p>
                {totalMB > 0 && (
                  <p className="text-xs text-gray-500">
                    Загружено: {totalMB.toFixed(1)} МБ • {uploadType === 'chunked' ? 'Многочастная загрузка' : 'Стандартная загрузка'}
                  </p>
                )}
              </div>

              <Button 
                onClick={onNewLead}
                className="w-full h-12 text-base font-medium"
              >
                <Icon name="Plus" size={18} className="mr-2" />
                Новый лид
              </Button>
            </div>
          )}

          {phase === 'error' && (
            <div className="text-center space-y-6">
              {/* Error Icon */}
              <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <Icon name="AlertCircle" size={48} className="text-red-600" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-800">
                  Ошибка загрузки
                </h2>
                <p className="text-sm text-gray-600">
                  {error}
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleRetry}
                  className="w-full h-12 text-base font-medium"
                >
                  <Icon name="RefreshCw" size={18} className="mr-2" />
                  Попробовать снова
                </Button>
                <Button 
                  onClick={onNewLead}
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                >
                  <Icon name="ArrowLeft" size={18} className="mr-2" />
                  Вернуться к записи
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadPage;