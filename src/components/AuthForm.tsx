import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthFormProps {
  onAuthSuccess: (user: User, token: string) => void;
  apiUrl: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess, apiUrl }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(apiUrl, {
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
        // Save to localStorage
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        
        toast({ 
          title: isLogin ? 'Добро пожаловать!' : 'Регистрация успешна!',
          description: isLogin ? 'Вы успешно вошли в систему' : 'Добро пожаловать на платформу'
        });
        
        onAuthSuccess(data.user, data.token);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-success/10 flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center pb-4 sm:pb-6">
          <Icon name="Video" size={40} className="mx-auto mb-3 sm:mb-4 text-primary sm:size-12" />
          <CardTitle className="text-xl sm:text-2xl font-bold">
            {isLogin ? 'Вход в систему' : 'Регистрация'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleAuth} className="space-y-3 sm:space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="text-sm sm:text-base">Имя</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введите ваше имя"
                  className="text-sm sm:text-base h-10 sm:h-11"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="text-sm sm:text-base h-10 sm:h-11"
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
};

export default AuthForm;