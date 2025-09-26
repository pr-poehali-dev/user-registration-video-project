import React from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AppHeaderProps {
  user: User;
  onLogout: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon name="Video" size={20} className="text-primary sm:w-6 sm:h-6" />
          <h1 className="font-bold text-lg sm:text-xl truncate">IMPERIA PROMO</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-muted-foreground hidden md:block max-w-32 sm:max-w-none truncate">
            Привет, {user.name}!
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('/comprehensive-video-test.html', '_blank')}
            className="h-8 px-2 sm:h-9 sm:px-3 bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700"
          >
            <Icon name="TestTube" size={14} className="sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Тест</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onLogout} className="h-8 px-2 sm:h-9 sm:px-3">
            <Icon name="LogOut" size={14} className="sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Выйти</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;