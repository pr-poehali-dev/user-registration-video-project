import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';

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

interface UsersListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  onDownloadAllUserVideos: (user: User) => void;
  onDeleteUser: (userId: string, userName: string) => void;
  deletingUserId: string | null;
  formatDate: (dateString: string) => string;
}

const UsersList: React.FC<UsersListProps> = ({
  users,
  selectedUser,
  onSelectUser,
  onDownloadAllUserVideos,
  onDeleteUser,
  deletingUserId,
  formatDate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="Users" size={20} />
          Пользователи ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedUser?.id === user.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
              }`}
              onClick={() => onSelectUser(user)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Регистрация: {formatDate(user.created_at)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Badge variant="secondary">
                    {user.leads.length} лидов
                  </Badge>
                  <div className="flex gap-1">
                    {user.leads.filter(l => l.has_video).length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadAllUserVideos(user);
                        }}
                      >
                        <Icon name="Download" size={12} className="mr-1" />
                        {user.leads.filter(l => l.has_video).length} видео
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deletingUserId === user.id}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {deletingUserId === user.id ? (
                            <Icon name="Loader2" size={12} className="animate-spin" />
                          ) : (
                            <Icon name="Trash2" size={12} />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить пользователя <strong>{user.name}</strong> ({user.email})?
                            <br /><br />
                            <span className="text-destructive">
                              ⚠️ Это действие удалит:
                              <br />• Учетную запись пользователя
                              <br />• Все его лиды ({user.leads.length} шт.)
                              <br />• Все связанные видеозаписи
                            </span>
                            <br /><br />
                            Это действие нельзя отменить.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteUser(user.id, user.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Удалить пользователя
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UsersList;