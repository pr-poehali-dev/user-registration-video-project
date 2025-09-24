import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [archivePassword, setArchivePassword] = useState('');
  const [isArchiveUnlocked, setIsArchiveUnlocked] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  const { toast } = useToast();

  // Handle archive password check
  const handleArchiveAccess = () => {
    if (archivePassword === '955650') {
      setIsArchiveUnlocked(true);
      setShowPasswordDialog(false);
      setActiveTab('archive');
      toast({ title: 'Доступ разрешен', description: 'Добро пожаловать в архив' });
    } else {
      toast({ title: 'Неверный пароль', description: 'Попробуйте еще раз', variant: 'destructive' });
      setArchivePassword('');
    }
  };

  const handleArchiveTabClick = () => {
    if (!isArchiveUnlocked) {
      setShowPasswordDialog(true);
    } else {
      setActiveTab('archive');
    }
  };

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
      // Detailed debug info
      console.log('=== STARTING VIDEO PROCESSING ===');
      console.log(`Blob info: size=${videoBlob.size} bytes (${(videoBlob.size/1024/1024).toFixed(2)}MB), type='${videoBlob.type}'`);
      
      if (videoBlob.size === 0) {
        setError('Видео не записано или повреждено');
        setLoading(false);
        return;
      }
      
      // Convert video blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        console.log(`FileReader completed. Result type: ${typeof dataUrl}`);
        console.log(`Data URL total length: ${dataUrl?.length || 0}`);
        
        if (dataUrl) {
          const commaIndex = dataUrl.indexOf(',');
          console.log(`Data URL prefix (${commaIndex} chars): ${dataUrl?.substring(0, Math.min(150, commaIndex + 1))}`);
        }
        
        if (!dataUrl || typeof dataUrl !== 'string') {
          console.error('FileReader failed to read video blob');
          setError('Ошибка при чтении видеофайла');
          setLoading(false);
          return;
        }
        
        const base64Video = dataUrl.split(',')[1]; // Remove data URL prefix
        
        if (!base64Video) {
          console.error('Failed to extract base64 from data URL');
          console.error('Full dataUrl:', dataUrl.substring(0, 200));
          setError('Ошибка при кодировании видео');
          setLoading(false);
          return;
        }
        
        console.log(`Base64 extracted: length=${base64Video.length} chars`);
        console.log(`Base64 first 100 chars: ${base64Video.substring(0, 100)}`);
        console.log(`Base64 last 20 chars: ${base64Video.substring(base64Video.length - 20)}`);
        
        // Определяем формат по MIME-типу blob'a
        const isMP4 = videoBlob.type.includes('mp4') || videoBlob.type.includes('avc');
        const isWebM = videoBlob.type.includes('webm');
        
        let filename = 'recording.mp4'; // По умолчанию MP4
        let contentType = 'video/mp4';
        
        if (isWebM) {
          filename = 'recording.webm';
          contentType = 'video/webm';
        }
        
        console.log(`Video format determined: ${contentType}, filename: ${filename}`);
        console.log(`Sending video: blob=${(videoBlob.size / 1024 / 1024).toFixed(2)}MB, base64=${(base64Video.length * 0.75 / 1024 / 1024).toFixed(2)}MB`);
        
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
            video_filename: filename,
            video_content_type: contentType
          })
        });

        const data = await response.json();
        
        console.log('Response status:', response.status);
        console.log('Response data:', data);
        
        if (response.ok && data.success) {
          // Reload leads
          await loadUserLeads(token);
          
          toast({ 
            title: '✅ Лид сохранен', 
            description: `Видео запись успешно отправлена (${contentType})`, 
          });
        } else {
          console.error('Failed to save lead:', response.status, data);
          toast({ 
            title: 'Ошибка сохранения', 
            description: data.error || `HTTP ${response.status}: Не удалось сохранить лид`, 
            variant: 'destructive' 
          });
        }
        setLoading(false);
      };
      
      console.log(`Starting FileReader for blob: size=${videoBlob.size}, type=${videoBlob.type}`);
      reader.readAsDataURL(videoBlob);
      
      // Add error handling for FileReader
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setError('Ошибка при чтении видеофайла');
        setLoading(false);
      };
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
            <TabsTrigger 
              value="archive" 
              className="flex items-center gap-2"
              onClick={(e) => {
                e.preventDefault();
                handleArchiveTabClick();
              }}
            >
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
            {isArchiveUnlocked ? (
              <LeadsArchive 
                videoLeads={videoLeads}
                onCreateLead={handleCreateLead}
                onLoadVideo={loadVideoForLead}
              />
            ) : (
              <div className="text-center py-12">
                <Icon name="Lock" size={64} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Для доступа к архиву необходимо ввести пароль</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Lock" size={20} />
              Доступ к архиву
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Введите пароль для доступа к архиву лидов:
            </p>
            <Input
              type="password"
              placeholder="Введите пароль"
              value={archivePassword}
              onChange={(e) => setArchivePassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleArchiveAccess();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setArchivePassword('');
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleArchiveAccess}>
                Войти
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;