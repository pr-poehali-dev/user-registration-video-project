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
    <div className="p-2 sm:p-3 border rounded-lg">
      <div className="flex justify-between items-start mb-2 gap-2">
        <p className="font-medium text-xs sm:text-sm flex-1 min-w-0 truncate pr-2">{lead.title}</p>
        <Badge variant={lead.has_video ? 'default' : 'secondary'} className="shrink-0 text-xs">
          <Icon name={lead.has_video ? 'Video' : 'FileText'} size={10} className="mr-1 sm:size-3" />
          {lead.has_video ? 'Видео' : 'Текст'}
        </Badge>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{lead.comments}</p>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {formatDate(lead.created_at)}
        </p>
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {lead.has_video && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2 sm:h-8 sm:px-3"
                onClick={() => onLoadVideo(lead.id)}
                disabled={loadingVideo}
              >
                {loadingVideo ? (
                  <Icon name="Loader2" size={10} className="animate-spin mr-1 sm:size-3" />
                ) : (
                  <Icon name="Play" size={10} className="mr-1 sm:size-3" />
                )}
                <span className="hidden sm:inline">Смотреть</span>
                <span className="sm:hidden">Плай</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="text-xs h-7 px-2 sm:h-8 sm:px-3"
                onClick={() => onDownloadVideo(lead.id, lead.title, userName)}
              >
                <Icon name="Download" size={10} className="mr-1 sm:size-3" />
                <span className="hidden sm:inline">Скачать</span>
                <span className="sm:hidden">Скач.</span>
              </Button>
            </>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="text-xs h-7 px-2 sm:h-8 sm:px-3"
                disabled={deletingLeadId === lead.id}
              >
                {deletingLeadId === lead.id ? (
                  <Icon name="Loader2" size={10} className="animate-spin mr-1 sm:size-3" />
                ) : (
                  <Icon name="Trash2" size={10} className="mr-1 sm:size-3" />
                )}
                <span className="hidden sm:inline">Удалить</span>
                <span className="sm:hidden">Удал.</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Подтверждение удаления</DialogTitle>
                <DialogDescription>
                  Вы действительно хотите удалить лид "{lead.title}"?
                  Это действие нельзя отменить.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <DialogTrigger asChild>
                  <Button variant="outline">Отмена</Button>
                </DialogTrigger>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deletingLeadId === lead.id}
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