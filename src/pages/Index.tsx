import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { ChunkedUploader } from '@/utils/chunkedUpload';

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
  adminVideo: 'https://functions.poehali.dev/72f44b46-a11c-4ea3-addb-cb69aee5546e',
  chunkedUpload: 'https://functions.poehali.dev/00f46d6e-5445-4f13-8032-e95041773736'
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
  const [externalUploadProgress, setExternalUploadProgress] = useState<number | undefined>(undefined);
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
    
    const videoSizeMB = videoBlob.size / (1024 * 1024);
    console.log('Video file size:', videoSizeMB.toFixed(2), 'MB');
    
    try {
      // Use chunked upload for files larger than 8MB
      if (videoSizeMB > 8) {
        console.log('Using chunked upload for large file');
        return await handleChunkedUpload(videoBlob, comments);
      } else {
        console.log('Using standard upload for small file');
        return await handleStandardUpload(videoBlob, comments);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: 'Ошибка', 
        description: error.message || 'Не удалось сохранить лид', 
        variant: 'destructive' 
      });
      setLoading(false);
    }
  };

  const handleChunkedUpload = async (videoBlob: Blob, comments: string): Promise<void> => {
    const uploader = new ChunkedUploader({
      file: videoBlob,
      title: `Лид от ${new Date().toLocaleDateString('ru-RU')}`,
      comments: comments,
      token: token,
      uploadUrl: API_URLS.chunkedUpload,
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      onProgress: (progress) => {
        setExternalUploadProgress(progress);
        console.log(`Upload progress: ${progress.toFixed(1)}%`);
      },
      onChunkUploaded: (chunk, total) => {
        console.log(`Chunk ${chunk}/${total} uploaded`);
      },
      onComplete: async (result) => {
        console.log('Chunked upload completed:', result);
        setExternalUploadProgress(100);
        
        toast({ 
          title: '✅ Большое видео успешно загружено', 
          description: `Размер: ${(videoBlob.size / (1024 * 1024)).toFixed(1)}MB. Лид сохранен!`,
          duration: 4000
        });
        
        // Reload leads and cleanup
        await loadUserLeads(token);
        setTimeout(() => {
          setLoading(false);
          setExternalUploadProgress(undefined);
        }, 1000);
      },
      onError: (error) => {
        console.error('Chunked upload error:', error);
        setLoading(false);
        setExternalUploadProgress(undefined);
        
        toast({ 
          title: 'Ошибка загрузки большого файла', 
          description: error, 
          variant: 'destructive' 
        });
      }
    });

    await uploader.upload();
  };

  const handleStandardUpload = async (videoBlob: Blob, comments: string): Promise<void> => {
    try {
      // Convert video blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        console.log('FileReader result length:', result.length);
        console.log('FileReader result prefix:', result.substring(0, 100));
        
        // Найдем позицию base64 данных после "base64,"
        const base64Index = result.indexOf('base64,');
        if (base64Index === -1) {
          console.error('Base64 marker not found in result');
          setLoading(false);
          return;
        }
        
        const base64Video = result.substring(base64Index + 7); // Skip "base64," (7 chars)
        console.log('Video blob type:', videoBlob.type);
        console.log('Video blob size:', videoBlob.size);
        console.log('Base64 length after split:', base64Video.length);
        
        if (!base64Video || base64Video.length === 0) {
          console.error('Base64 conversion failed - empty result');
          toast({ 
            title: 'Ошибка кодирования видео', 
            description: 'Не удалось преобразовать видео в base64', 
            variant: 'destructive' 
          });
          setLoading(false);
          return;
        }
        
        console.log('Starting POST request to:', API_URLS.leads);
        console.log('Token length:', token.length);
        console.log('Comments:', comments);
        console.log('Base64 video length:', base64Video.length);
        
        // Check file size limits
        const videoSizeMB = videoBlob.size / (1024 * 1024);
        const base64SizeMB = (base64Video.length * 3) / (4 * 1024 * 1024); // base64 is ~33% larger
        console.log('Video blob size:', videoBlob.size, 'bytes (', videoSizeMB.toFixed(2), 'MB)');
        console.log('Base64 size estimate:', base64SizeMB.toFixed(2), 'MB');
        
        // Warn if approaching limits
        if (videoSizeMB > 8) {
          console.warn('Video size approaching Cloud Function limits!');
          toast({ 
            title: '⚠️ Большой размер видео', 
            description: `Размер: ${videoSizeMB.toFixed(1)}MB. Это может вызвать проблемы с загрузкой.`, 
            variant: 'destructive' 
          });
        }
        
        const requestBody = {
          title: `Лид от ${new Date().toLocaleDateString('ru-RU')}`,
          comments: comments,
          video_data: base64Video,
          video_filename: 'recording.mp4',
          video_content_type: 'video/mp4'
        };
        
        console.log('Request body keys:', Object.keys(requestBody));
        
        // Create fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(API_URLS.leads, {
          method: 'POST',
          headers: {
            'X-Auth-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response text that failed to parse:', responseText);
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
        }
        
        if (response.ok && data.success) {
          // Reload leads
          await loadUserLeads(token);
          
          // Stay on record tab - don't switch to archive
        } else {
          toast({ 
            title: 'Ошибка сохранения', 
            description: data.error || 'Не удалось сохранить лид', 
            variant: 'destructive' 
          });
        }
        setLoading(false);
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        toast({ 
          title: 'Ошибка чтения файла', 
          description: 'Не удалось прочитать видео файл', 
          variant: 'destructive' 
        });
        setLoading(false);
      };
      
      reader.readAsDataURL(videoBlob);
    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Не удалось сохранить лид';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Превышено время ожидания (30 сек) - попробуйте еще раз';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Ошибка сети - проверьте подключение к интернету';
      } else if (error.message.includes('Invalid JSON')) {
        errorMessage = 'Сервер вернул некорректный ответ';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышено время ожидания - попробуйте еще раз';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: 'Ошибка', 
        description: errorMessage, 
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

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-12 sm:h-10">
            <TabsTrigger value="record" className="flex items-center gap-2 text-sm sm:text-base font-medium">
              <Icon name="Video" size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Запись лида</span>
              <span className="xs:hidden">Запись</span>
            </TabsTrigger>
            <TabsTrigger 
              value="archive" 
              className="flex items-center gap-2 text-sm sm:text-base font-medium"
              onClick={(e) => {
                e.preventDefault();
                handleArchiveTabClick();
              }}
            >
              <Icon name="Archive" size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Архив ({videoLeads.length})</span>
              <span className="xs:hidden">Архив</span>
            </TabsTrigger>
          </TabsList>

          {/* Recording Tab */}
          <TabsContent value="record" className="space-y-6">
            <VideoRecorder 
              onSaveLead={handleSaveLead}
              loading={loading}
              externalUploadProgress={externalUploadProgress}
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
        <DialogContent className="sm:max-w-md mx-3 rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Icon name="Lock" size={18} className="sm:w-5 sm:h-5" />
              Доступ к архиву
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6">
            <p className="text-sm sm:text-base text-muted-foreground">
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
              className="h-12 sm:h-10 text-base sm:text-sm"
            />
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setArchivePassword('');
                }}
                className="h-12 sm:h-10 order-2 sm:order-1 touch-manipulation"
              >
                Отмена
              </Button>
              <Button onClick={handleArchiveAccess} className="h-12 sm:h-10 order-1 sm:order-2 touch-manipulation">
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