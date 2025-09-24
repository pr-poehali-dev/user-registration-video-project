import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import AdminStatsCards from './admin/AdminStatsCards';
import UsersList from './admin/UsersList';
import UserDetails from './admin/UserDetails';

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
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  
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
        const newUsers = data.users || [];
        setUsers(newUsers);
        setStats(data.statistics || { total_users: 0, total_leads: 0, total_videos: 0 });
        
        // Update selected user with fresh data if one was selected
        if (selectedUser) {
          const updatedSelectedUser = newUsers.find((u: User) => u.id === selectedUser.id);
          setSelectedUser(updatedSelectedUser || null);
        }
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
          const dataUrl = data.video_url;
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          
          const cleanUserName = userName.replace(/[^a-zA-Z0-9]/g, '_');
          const cleanTitle = leadTitle.replace(/[^a-zA-Z0-9]/g, '_');
          link.download = `${cleanUserName}_${cleanTitle}_${leadId}.webm`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
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

  const deleteLead = async (leadId: string, leadTitle: string) => {
    setDeletingLeadId(leadId);
    
    try {
      const leadsApiUrl = 'https://functions.poehali.dev/a119ce14-9a5b-40de-b18f-3ef1f6dc7484';
      const response = await fetch(`${leadsApiUrl}?lead_id=${leadId}`, {
        method: 'DELETE',
        headers: {
          'X-Auth-Token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          toast({
            title: '✅ Лид удален',
            description: `Лид "${leadTitle}" успешно удален из системы`,
          });
          
          // Reload admin data to refresh the UI (selectedUser will be updated automatically)
          await loadAdminData();
        } else {
          throw new Error(data.error || 'Failed to delete lead');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network error');
      }
    } catch (error) {
      toast({
        title: 'Ошибка удаления',
        description: `Не удалось удалить лид: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        variant: 'destructive'
      });
    } finally {
      setDeletingLeadId(null);
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

    for (let i = 0; i < videosToDownload.length; i++) {
      const lead = videosToDownload[i];
      await downloadVideo(lead.id, lead.title, user.name);
      
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
      <AdminStatsCards stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* На мобильных устройствах показываем карточки стопкой */}
        <UsersList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          onDownloadAllUserVideos={downloadAllUserVideos}
          formatDate={formatDate}
        />
        
        <UserDetails
          selectedUser={selectedUser}
          videoUrl={videoUrl}
          loadingVideo={loadingVideo}
          deletingLeadId={deletingLeadId}
          onLoadVideo={loadVideo}
          onDownloadVideo={downloadVideo}
          onDeleteLead={deleteLead}
          onDownloadAllUserVideos={downloadAllUserVideos}
          formatDate={formatDate}
        />
      </div>
    </div>
  );
};

export default AdminPanel;