import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name: string;
}

interface VideoLead {
  id: string;
  videoUrl: string;
  comments: string;
  createdAt: string;
  title: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      if (email === 'demo@example.com' && password === 'demo123') {
        setUser({ id: '1', email, name: 'Demo User' });
        toast({ title: 'Добро пожаловать!', description: 'Вы успешно вошли в систему' });
      } else {
        toast({ title: 'Ошибка', description: 'Неверные данные для входа', variant: 'destructive' });
      }
    } else {
      setUser({ id: Date.now().toString(), email, name });
      toast({ title: 'Регистрация успешна!', description: 'Добро пожаловать на платформу' });
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

    const newLead: VideoLead = {
      id: Date.now().toString(),
      videoUrl: videoUrl,
      comments: comments,
      createdAt: new Date().toLocaleDateString('ru-RU'),
      title: `Лид от ${new Date().toLocaleDateString('ru-RU')}`
    };

    setVideoLeads(prev => [newLead, ...prev]);
    setComments('');
    retakeVideo();
    setActiveTab('archive');
    
    toast({ title: 'Лид сохранен!', description: 'Видео и комментарии добавлены в архив' });
  };

  const logout = () => {
    setUser(null);
    setVideoLeads([]);
    setComments('');
    retakeVideo();
    setActiveTab('record');
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
                  placeholder="demo@example.com"
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
                  placeholder="demo123"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
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
                    disabled={!videoBlob || !comments.trim()}
                  >
                    <Icon name="Save" size={16} className="mr-2" />
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
                  <Card key={lead.id} className="animate-fade-in">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{lead.title}</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {lead.createdAt}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <video
                            src={lead.videoUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
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
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;