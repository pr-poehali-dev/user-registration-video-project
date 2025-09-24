import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

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

interface AdminStats {
  total_users: number;
  total_leads: number;
  total_videos: number;
}

interface AdminPanelProps {
  token: string;
  adminApiUrl: string;
  videoApiUrl: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ token, adminApiUrl, videoApiUrl }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({ total_users: 0, total_leads: 0, total_videos: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loadingVideo, setLoadingVideo] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const response = await fetch(adminApiUrl, {
        method: 'GET',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setStats(data.statistics || { total_users: 0, total_leads: 0, total_videos: 0 });
      } else {
        toast({
          title: 'Ошибка загрузки',
          description: 'Не удалось загрузить данные администратора',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVideo = async (leadId: string) => {
    setLoadingVideo(true);
    setVideoUrl('');
    
    try {
      const response = await fetch(`${videoApiUrl}?id=${leadId}`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.video_url) {
          setVideoUrl(data.video_url);
        } else {
          toast({
            title: 'Видео не найдено',
            description: 'Видео для этого лида не существует',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Ошибка загрузки видео',
        description: 'Не удалось загрузить видео',
        variant: 'destructive'
      });
    } finally {
      setLoadingVideo(false);
    }
  };

  const downloadVideo = async (leadId: string, leadTitle: string, userName: string) => {
    try {
      const response = await fetch(`${videoApiUrl}?id=${leadId}`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.video_url) {
          // Convert data URL to blob for proper download
          const dataUrl = data.video_url;
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          // Create blob URL and download
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          
          // Clean filename for download
          const cleanUserName = userName.replace(/[^a-zA-Z0-9]/g, '_');
          const cleanTitle = leadTitle.replace(/[^a-zA-Z0-9]/g, '_');
          link.download = `${cleanUserName}_${cleanTitle}_${leadId}.webm`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          URL.revokeObjectURL(blobUrl);
          
          toast({
            title: 'Скачивание начато',
            description: `Видео "${leadTitle}" от ${userName} загружается`,
          });
        } else {
          toast({
            title: 'Видео не найдено',
            description: 'Видео для этого лида не существует',
            variant: 'destructive'
          });
        }
      } else {
        const errorData = await response.json();
        toast({
          title: 'Ошибка доступа',
          description: errorData.error || 'Не удалось получить видео',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка скачивания',
        description: 'Не удалось скачать видео',
        variant: 'destructive'
      });
    }
  };

  const downloadAllUserVideos = async (user: User) => {
    const videosToDownload = user.leads.filter(lead => lead.has_video);
    
    if (videosToDownload.length === 0) {
      toast({
        title: 'Нет видео',
        description: `У пользователя ${user.name} нет видеозаписей`,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Скачивание начато',
      description: `Загружаю ${videosToDownload.length} видео от ${user.name}`,
    });

    // Download each video with a small delay
    for (let i = 0; i < videosToDownload.length; i++) {
      const lead = videosToDownload[i];
      await downloadVideo(lead.id, lead.title, user.name);
      
      // Small delay between downloads to avoid overwhelming the server
      if (i < videosToDownload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4" />
          <p>Загрузка данных администратора...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Icon name="Users" size={24} className="text-blue-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.total_users}</p>
                <p className="text-sm text-muted-foreground">Пользователей</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Icon name="FileText" size={24} className="text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.total_leads}</p>
                <p className="text-sm text-muted-foreground">Лидов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Icon name="Video" size={24} className="text-red-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.total_videos}</p>
                <p className="text-sm text-muted-foreground">Видеозаписей</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Users" size={20} />
              Пользователи ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Регистрация: {formatDate(user.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge variant="secondary">
                        {user.leads.length} лидов
                      </Badge>
                      {user.leads.filter(l => l.has_video).length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadAllUserVideos(user);
                          }}
                        >
                          <Icon name="Download" size={12} className="mr-1" />
                          {user.leads.filter(l => l.has_video).length} видео
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Details */}
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
                        {/* Buttons to download all videos */}
                        <div className="flex gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadAllUserVideos(selectedUser)}
                            disabled={selectedUser.leads.filter(l => l.has_video).length === 0}
                          >
                            <Icon name="Download" size={12} className="mr-1" />
                            Скачать все видео ({selectedUser.leads.filter(l => l.has_video).length})
                          </Button>
                        </div>
                        
                        {selectedUser.leads.map((lead) => (
                          <div key={lead.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium text-sm">{lead.title}</p>
                              <Badge variant={lead.has_video ? 'default' : 'secondary'}>
                                <Icon name={lead.has_video ? 'Video' : 'FileText'} size={12} className="mr-1" />
                                {lead.has_video ? 'Видео' : 'Текст'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{lead.comments}</p>
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-muted-foreground">
                                {formatDate(lead.created_at)}
                              </p>
                              {lead.has_video && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => loadVideo(lead.id)}
                                    disabled={loadingVideo}
                                  >
                                    {loadingVideo ? (
                                      <Icon name="Loader2" size={12} className="animate-spin mr-1" />
                                    ) : (
                                      <Icon name="Play" size={12} className="mr-1" />
                                    )}
                                    Смотреть
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => downloadVideo(lead.id, lead.title, selectedUser.name)}
                                  >
                                    <Icon name="Download" size={12} className="mr-1" />
                                    Скачать
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
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
      </div>
    </div>
  );
};

export default AdminPanel;