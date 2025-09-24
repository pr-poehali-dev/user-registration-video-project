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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <Icon name="Users" size={20} className="text-blue-500 mr-2 sm:mr-3 sm:size-6" />
            <div>
              <p className="text-lg sm:text-2xl font-bold">{stats.total_users}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Пользователей</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <Icon name="FileText" size={20} className="text-green-500 mr-2 sm:mr-3 sm:size-6" />
            <div>
              <p className="text-lg sm:text-2xl font-bold">{stats.total_leads}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Лидов</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <Icon name="Video" size={20} className="text-red-500 mr-2 sm:mr-3 sm:size-6" />
            <div>
              <p className="text-lg sm:text-2xl font-bold">{stats.total_videos}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Видеозаписей</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsCards;