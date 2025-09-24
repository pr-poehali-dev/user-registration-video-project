import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

interface Lead {
  id: string;
  title: string;
  comments: string;
  created_at: string;
  video_filename?: string;
  has_video: boolean;
}

interface LeadItemProps {
  lead: Lead;
  userName: string;
  loadingVideo: boolean;
  deletingLeadId: string | null;
  onLoadVideo: (leadId: string) => void;
  onDownloadVideo: (leadId: string, leadTitle: string, userName: string) => void;
  onDeleteLead: (leadId: string, leadTitle: string) => void;
  formatDate: (dateString: string) => string;
}

const LeadItem: React.FC<LeadItemProps> = ({
  lead,
  userName,
  loadingVideo,
  deletingLeadId,
  onLoadVideo,
  onDownloadVideo,
  onDeleteLead,
  formatDate
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleDelete = async () => {
    await onDeleteLead(lead.id, lead.title);
    setIsDialogOpen(false);
  };
  return (
    <div className="p-3 sm:p-4 border rounded-lg">
      <div className="flex justify-between items-start mb-3 gap-2">
        <p className="font-medium text-sm flex-1 min-w-0">{lead.title}</p>
        <Badge variant={lead.has_video ? 'default' : 'secondary'} className="flex-shrink-0">
          <Icon name={lead.has_video ? 'Video' : 'FileText'} size={12} className="mr-1" />
          {lead.has_video ? 'Видео' : 'Текст'}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{lead.comments}</p>
      
      {/* Mobile: Stack date and buttons vertically */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <p className="text-xs text-muted-foreground order-2 sm:order-1">
          {formatDate(lead.created_at)}
        </p>
        <div className="flex flex-wrap gap-2 order-1 sm:order-2">
          {lead.has_video && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onLoadVideo(lead.id)}
                disabled={loadingVideo}
                className="flex-1 sm:flex-none h-9 text-xs sm:text-sm touch-manipulation"
              >
                {loadingVideo ? (
                  <Icon name="Loader2" size={12} className="animate-spin mr-1" />
                ) : (
                  <Icon name="Play" size={12} className="mr-1" />
                )}
                <span className="hidden xs:inline">Смотреть</span>
                <span className="xs:hidden">Плей</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onDownloadVideo(lead.id, lead.title, userName)}
                className="flex-1 sm:flex-none h-9 text-xs sm:text-sm touch-manipulation"
              >
                <Icon name="Download" size={12} className="mr-1" />
                <span className="hidden xs:inline">Скачать</span>
                <span className="xs:hidden">Дл</span>
              </Button>
            </>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={deletingLeadId === lead.id}
                className="flex-1 sm:flex-none h-9 text-xs sm:text-sm touch-manipulation"
              >
                {deletingLeadId === lead.id ? (
                  <Icon name="Loader2" size={12} className="animate-spin mr-1" />
                ) : (
                  <Icon name="Trash2" size={12} className="mr-1" />
                )}
                <span className="hidden xs:inline">Удалить</span>
                <span className="xs:hidden">Уд</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md mx-3 rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Подтверждение удаления</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Вы действительно хотите удалить лид "{lead.title}"?
                  Это действие нельзя отменить.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-2 mt-4">
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-12 sm:h-10 order-2 sm:order-1 touch-manipulation">Отмена</Button>
                </DialogTrigger>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deletingLeadId === lead.id}
                  className="h-12 sm:h-10 order-1 sm:order-2 touch-manipulation"
                >
                  {deletingLeadId === lead.id ? (
                    <Icon name="Loader2" size={12} className="animate-spin mr-1" />
                  ) : (
                    <Icon name="Trash2" size={12} className="mr-1" />
                  )}
                  Удалить навсегда
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default LeadItem;