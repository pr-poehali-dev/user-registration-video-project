import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import LeadItem from './LeadItem';
import VideoPlayer from './VideoPlayer';

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="Eye" size={20} />
          {selectedUser ? `Данные: ${selectedUser.name}` : 'Выберите пользователя'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedUser ? (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Информация о пользователе:</h4>
              <div className="text-sm space-y-1">
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Регистрация:</strong> {formatDate(selectedUser.created_at)}</p>
                <p><strong>Лидов:</strong> {selectedUser.leads.length}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Лиды пользователя:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedUser.leads.length > 0 ? (
                  <>
                    <div className="flex gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDownloadAllUserVideos(selectedUser)}
                        disabled={selectedUser.leads.filter(l => l.has_video).length === 0}
                      >
                        <Icon name="Download" size={12} className="mr-1" />
                        Скачать все видео ({selectedUser.leads.filter(l => l.has_video).length})
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
                <VideoPlayer 
                  videoUrl={videoUrl}
                  leadTitle="Просмотр лида"
                  className="w-full"
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