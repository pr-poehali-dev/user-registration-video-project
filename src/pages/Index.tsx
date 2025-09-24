import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

// Components
import AuthForm from '@/components/AuthForm';
import AppHeader from '@/components/AppHeader';
import VideoRecorder from '@/components/VideoRecorder';
import LeadsArchive from '@/components/LeadsArchive';
import AdminPanel from '@/components/AdminPanel';

// API URLs
const API_URLS = {
  auth: 'https://functions.poehali.dev/080ec769-925f-4132-8cd3-549c89bdc4c0',
  leads: 'https://functions.poehali.dev/a119ce14-9a5b-40de-b18f-3ef1f6dc7484',
  video: 'https://functions.poehali.dev/75e3022c-965a-4cd9-b5c1-bd179806e509',
  admin: 'https://functions.poehali.dev/bf64fc6c-c075-4df6-beb9-f5b527586fa1',
  adminVideo: 'https://functions.poehali.dev/72f44b46-a11c-4ea3-addb-cb69aee5546e'
};

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface VideoLead {
  id: string;
  title: string;
  comments: string;
  video_url?: string;
  created_at: string;
  video_filename?: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');
  const [videoLeads, setVideoLeads] = useState<VideoLead[]>([]);
  const [activeTab, setActiveTab] = useState('record');
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user_data');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        loadUserLeads(savedToken);
      } catch (error) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }
  }, []);

  const loadUserLeads = async (authToken: string) => {
    try {
      const response = await fetch(API_URLS.leads, {
        method: 'GET',
        headers: {
          'X-Auth-Token': authToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideoLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    }
  };

  const handleAuthSuccess = async (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    
    // Store token and user data
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user_data', JSON.stringify(userData));
    
    // Load user leads only for regular users, not admin
    if (userData.role !== 'admin') {
      await loadUserLeads(authToken);
    }
  };

  const handleSaveLead = async (videoBlob: Blob, comments: string) => {
    setLoading(true);

    try {
      // Convert video blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Video = (reader.result as string).split(',')[1]; // Remove data URL prefix
        
        const response = await fetch(API_URLS.leads, {
          method: 'POST',
          headers: {
            'X-Auth-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: `Лид от ${new Date().toLocaleDateString('ru-RU')}`,
            comments: comments,
            video_data: base64Video,
            video_filename: 'recording.webm',
            video_content_type: 'video/webm'
          })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          toast({ title: 'Лид сохранен!', description: 'Видео и комментарии добавлены в архив' });
          
          // Reload leads
          await loadUserLeads(token);
          setActiveTab('archive');
        } else {
          toast({ 
            title: 'Ошибка сохранения', 
            description: data.error || 'Не удалось сохранить лид', 
            variant: 'destructive' 
          });
        }
        setLoading(false);
      };
      
      reader.readAsDataURL(videoBlob);
    } catch (error) {
      toast({ 
        title: 'Ошибка', 
        description: 'Не удалось сохранить лид', 
        variant: 'destructive' 
      });
      setLoading(false);
    }
  };

  const loadVideoForLead = async (leadId: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URLS.video}?id=${leadId}`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.video_url || null;
      }
    } catch (error) {
      console.error('Failed to load video:', error);
    }
    return null;
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    setVideoLeads([]);
    setActiveTab('record');
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    toast({ title: 'Выход выполнен', description: 'До свидания!' });
  };

  const handleCreateLead = () => {
    setActiveTab('record');
  };

  if (!user) {
    return (
      <AuthForm 
        onAuthSuccess={handleAuthSuccess}
        apiUrl={API_URLS.auth}
      />
    );
  }

  // Admin interface
  if (user.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5">
        <AppHeader user={user} onLogout={handleLogout} />
        <AdminPanel 
          token={token}
          adminApiUrl={API_URLS.admin}
          videoApiUrl={API_URLS.adminVideo}
        />
      </div>
    );
  }

  // Regular user interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5">
      <AppHeader user={user} onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="record" className="flex items-center gap-2">
              <Icon name="Video" size={16} />
              Запись лида
            </TabsTrigger>
            <TabsTrigger value="archive" className="flex items-center gap-2">
              <Icon name="Archive" size={16} />
              Архив ({videoLeads.length})
            </TabsTrigger>
          </TabsList>

          {/* Recording Tab */}
          <TabsContent value="record" className="space-y-6">
            <VideoRecorder 
              onSaveLead={handleSaveLead}
              loading={loading}
            />
          </TabsContent>

          {/* Archive Tab */}
          <TabsContent value="archive" className="space-y-6">
            <LeadsArchive 
              videoLeads={videoLeads}
              onCreateLead={handleCreateLead}
              onLoadVideo={loadVideoForLead}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;