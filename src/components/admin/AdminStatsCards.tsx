import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface AdminStats {
  total_users: number;
  total_leads: number;
  total_videos: number;
}

interface AdminStatsCardsProps {
  stats: AdminStats;
}

const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Icon name="Users" size={24} className="text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total_users}</p>
              <p className="text-sm text-muted-foreground">Пользователей</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Icon name="FileText" size={24} className="text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total_leads}</p>
              <p className="text-sm text-muted-foreground">Лидов</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Icon name="Video" size={24} className="text-red-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total_videos}</p>
              <p className="text-sm text-muted-foreground">Видеозаписей</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsCards;