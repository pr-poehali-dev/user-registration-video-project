import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

// API URLs
const API_URLS = {
  auth: 'https://functions.poehali.dev/080ec769-925f-4132-8cd3-549c89bdc4c0',
  leads: 'https://functions.poehali.dev/a119ce14-9a5b-40de-b18f-3ef1f6dc7484',
  video: 'https://functions.poehali.dev/75e3022c-965a-4cd9-b5c1-bd179806e509'
};

interface User {
  id: string;
  email: string;
  name: string;
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
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [comments, setComments] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [videoLeads, setVideoLeads] = useState<VideoLead[]>([]);
  const [activeTab, setActiveTab] = useState('record');
  const [loading, setLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isLogin ? 'login' : 'register',
          email: email.trim(),
          password,
          name: name.trim()
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        
        // Save to localStorage
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        
        toast({ 
          title: isLogin ? 'Добро пожаловать!' : 'Регистрация успешна!',
          description: isLogin ? 'Вы успешно вошли в систему' : 'Добро пожаловать на платформу'
        });
        
        // Load user's leads
        await loadUserLeads(data.token);
      } else {
        toast({ 
          title: 'Ошибка', 
          description: data.error || 'Неизвестная ошибка', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      toast({ 
        title: 'Ошибка подключения', 
        description: 'Не удалось связаться с сервером', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

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

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 360 }
        },
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: 'Запись началась', description: 'Записываем видео с задней камеры' });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось получить доступ к камере', variant: 'destructive' });
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: 'Запись завершена', description: 'Видео готово к просмотру' });
    }
  };

  const retakeVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoBlob(null);
    setVideoUrl('');
    toast({ title: 'Готов к пересъемке', description: 'Можете записать новое видео' });
  };

  const saveLead = async () => {
    if (!videoBlob || !comments.trim()) {
      toast({ title: 'Заполните все поля', description: 'Нужно записать видео и добавить комментарий', variant: 'destructive' });
      return;
    }

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
          
          // Clear form
          setComments('');
          retakeVideo();
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

  const logout = () => {
    setUser(null);
    setToken('');
    setVideoLeads([]);
    setComments('');
    retakeVideo();
    setActiveTab('record');
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    toast({ title: 'Выход выполнен', description: 'До свидания!' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-success/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <Icon name="Video" size={48} className="mx-auto mb-4 text-primary" />
            <CardTitle className="text-2xl font-bold">
              {isLogin ? 'Вход в систему' : 'Регистрация'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Введите ваше имя"
                    required={!isLogin}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                ) : null}
                {isLogin ? 'Войти' : 'Зарегистрироваться'}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline text-sm"
              >
                {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icon name="Video" size={24} className="text-primary" />
            <h1 className="font-bold text-xl">VideoLeads</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Привет, {user.name}!
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              <Icon name="LogOut" size={16} className="mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

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
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Video Recording Block */}
              <Card className="animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Camera" size={20} />
                    Запись видео
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                    {!videoUrl ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {!isRecording && !videoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                          <Icon name="Camera" size={48} className="mx-auto mb-2 text-gray-400" />
                          <p className="text-gray-500">Нажмите "Начать запись"</p>
                        </div>
                      </div>
                    )}
                    
                    {isRecording && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">REC</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isRecording && !videoUrl && (
                      <Button onClick={startVideoRecording} className="flex-1">
                        <Icon name="Play" size={16} className="mr-2" />
                        Начать запись
                      </Button>
                    )}
                    
                    {isRecording && (
                      <Button onClick={stopVideoRecording} variant="destructive" className="flex-1">
                        <Icon name="Square" size={16} className="mr-2" />
                        Остановить
                      </Button>
                    )}
                    
                    {videoUrl && (
                      <Button onClick={retakeVideo} variant="outline" className="flex-1">
                        <Icon name="RefreshCw" size={16} className="mr-2" />
                        Пересъемка
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Comments Block */}
              <Card className="animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="FileText" size={20} />
                    Комментарии к лиду
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Опишите детали лида, контактную информацию, особые заметки..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                  
                  <Button 
                    onClick={saveLead} 
                    className="w-full bg-success hover:bg-success/90"
                    disabled={!videoBlob || !comments.trim() || loading}
                  >
                    {loading ? (
                      <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Icon name="Save" size={16} className="mr-2" />
                    )}
                    Сохранить лид
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Archive Tab */}
          <TabsContent value="archive" className="space-y-6">
            {videoLeads.length === 0 ? (
              <Card className="text-center py-12 animate-fade-in">
                <CardContent>
                  <Icon name="Archive" size={64} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold mb-2">Архив пуст</h3>
                  <p className="text-muted-foreground mb-4">
                    Создайте первый лид, чтобы увидеть его здесь
                  </p>
                  <Button onClick={() => setActiveTab('record')}>
                    <Icon name="Plus" size={16} className="mr-2" />
                    Создать лид
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {videoLeads.map((lead) => (
                  <VideoLeadCard key={lead.id} lead={lead} onLoadVideo={loadVideoForLead} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Separate component for video lead cards to handle async video loading
const VideoLeadCard: React.FC<{ 
  lead: VideoLead; 
  onLoadVideo: (leadId: string) => Promise<string | null>;
}> = ({ lead, onLoadVideo }) => {
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const handleLoadVideo = async () => {
    if (videoDataUrl) return; // Already loaded
    
    setVideoLoading(true);
    const dataUrl = await onLoadVideo(lead.id);
    if (dataUrl) {
      setVideoDataUrl(dataUrl);
    }
    setVideoLoading(false);
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{lead.title}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {lead.created_at}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
            {videoDataUrl ? (
              <video
                src={videoDataUrl}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button 
                  onClick={handleLoadVideo} 
                  variant="outline"
                  disabled={videoLoading}
                >
                  {videoLoading ? (
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Icon name="Play" size={16} className="mr-2" />
                  )}
                  Загрузить видео
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Комментарии:</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
              {lead.comments}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Index;