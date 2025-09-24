import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import LeadItem from './LeadItem';

interface Lead {
  id: string;
  title: string;
  comments: string;
  created_at: string;
  video_filename?: string;
  has_video: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  leads: Lead[];
}

interface UserDetailsProps {
  selectedUser: User | null;
  videoUrl: string;
  loadingVideo: boolean;
  deletingLeadId: string | null;
  onLoadVideo: (leadId: string) => void;
  onDownloadVideo: (leadId: string, leadTitle: string, userName: string) => void;
  onDeleteLead: (leadId: string, leadTitle: string) => void;
  onDownloadAllUserVideos: (user: User) => void;
  formatDate: (dateString: string) => string;
}

const UserDetails: React.FC<UserDetailsProps> = ({
  selectedUser,
  videoUrl,
  loadingVideo,
  deletingLeadId,
  onLoadVideo,
  onDownloadVideo,
  onDeleteLead,
  onDownloadAllUserVideos,
  formatDate
}) => {
  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Icon name="Eye" size={18} className="sm:size-5" />
          <span className="truncate">
            {selectedUser ? `Данные: ${selectedUser.name}` : 'Выберите пользователя'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {selectedUser ? (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">Информация о пользователе:</h4>
              <div className="text-xs sm:text-sm space-y-1">
                <p><strong>Email:</strong> <span className="break-all">{selectedUser.email}</span></p>
                <p><strong>Регистрация:</strong> {formatDate(selectedUser.created_at)}</p>
                <p><strong>Лидов:</strong> {selectedUser.leads.length}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">Лиды пользователя:</h4>
              <div className="space-y-2 max-h-56 sm:max-h-64 overflow-y-auto">
                {selectedUser.leads.length > 0 ? (
                  <>
                    <div className="flex gap-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 px-2 sm:h-9 sm:px-3"
                        onClick={() => onDownloadAllUserVideos(selectedUser)}
                        disabled={selectedUser.leads.filter(l => l.has_video).length === 0}
                      >
                        <Icon name="Download" size={12} className="mr-1" />
                        <span className="hidden sm:inline">Скачать все видео</span>
                        <span className="sm:hidden">Все видео</span>
                        <span className="ml-1">({selectedUser.leads.filter(l => l.has_video).length})</span>
                      </Button>
                    </div>
                    
                    {selectedUser.leads.map((lead) => (
                      <LeadItem
                        key={lead.id}
                        lead={lead}
                        userName={selectedUser.name}
                        loadingVideo={loadingVideo}
                        deletingLeadId={deletingLeadId}
                        onLoadVideo={onLoadVideo}
                        onDownloadVideo={onDownloadVideo}
                        onDeleteLead={onDeleteLead}
                        formatDate={formatDate}
                      />
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    У пользователя пока нет лидов
                  </p>
                )}
              </div>
            </div>

            {videoUrl && (
              <div>
                <h4 className="font-medium mb-2">Просмотр видео:</h4>
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full max-h-64 rounded-lg border"
                />
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Выберите пользователя из списка слева для просмотра его данных
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default UserDetails;