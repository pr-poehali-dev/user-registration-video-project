import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  formatDate: (dateString: string) => string;
}

const UsersList: React.FC<UsersListProps> = ({
  users,
  selectedUser,
  onSelectUser,
  onDownloadAllUserVideos,
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