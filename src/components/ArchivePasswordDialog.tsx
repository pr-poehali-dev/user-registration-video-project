import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

interface ArchivePasswordDialogProps {
  isOpen: boolean;
  password: string;
  onPasswordChange: (password: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const ArchivePasswordDialog: React.FC<ArchivePasswordDialogProps> = ({
  isOpen,
  password,
  onPasswordChange,
  onClose,
  onSubmit
}) => {
  const handleClose = () => {
    onClose();
    onPasswordChange('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSubmit();
              }
            }}
            className="h-12 sm:h-10 text-base sm:text-sm"
          />
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="h-12 sm:h-10 order-2 sm:order-1 touch-manipulation"
            >
              Отмена
            </Button>
            <Button 
              onClick={onSubmit} 
              className="h-12 sm:h-10 order-1 sm:order-2 touch-manipulation"
            >
              Войти
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArchivePasswordDialog;