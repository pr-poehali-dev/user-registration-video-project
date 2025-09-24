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
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="Video" size={20} className="text-primary sm:size-6" />
          <h1 className="font-bold text-lg sm:text-xl truncate">IMPERIA PROMO</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs sm:text-sm text-muted-foreground hidden md:block">
            Привет, {user.name}!
          </span>
          <Button variant="outline" size="sm" onClick={onLogout} className="text-xs sm:text-sm h-8 px-2 sm:h-9 sm:px-3">
            <Icon name="LogOut" size={14} className="mr-1 sm:mr-2 sm:size-4" />
            <span className="hidden sm:inline">Выйти</span>
            <span className="sm:hidden">Выход</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;