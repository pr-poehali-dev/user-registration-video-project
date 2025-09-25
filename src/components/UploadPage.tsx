import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface UploadPageProps {
  progress: number;
  isComplete: boolean;
  onNewLead: () => void;
  uploadedMB?: number;
  totalMB?: number;
  uploadType?: 'standard' | 'chunked';
}

const UploadPage: React.FC<UploadPageProps> = ({ 
  progress, 
  isComplete, 
  onNewLead, 
  uploadedMB = 0, 
  totalMB = 0, 
  uploadType = 'standard' 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {!isComplete ? (
            // Loading State
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="Upload" size={32} className="text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-800">
                  Загружаем лид...
                </h2>
                <p className="text-sm text-gray-600">
                  Пожалуйста, не закрывайте страницу
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    {uploadType === 'chunked' ? 'Многочастная загрузка' : 'Загрузка видео'}
                  </span>
                  <span>
                    {totalMB > 0 ? 
                      `${uploadedMB.toFixed(1)} / ${totalMB.toFixed(1)} МБ` : 
                      `${Math.round(progress)}%`
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
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
            </div>
          ) : (
            // Success State
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Icon name="Check" size={40} className="text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-800">
                  Лид отправлен
                </h2>
                <p className="text-sm text-gray-600">
                  Видео и комментарии успешно сохранены
                </p>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadPage;