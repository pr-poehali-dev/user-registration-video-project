import React from 'react';
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
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <p className="font-medium text-sm">{lead.title}</p>
        <Badge variant={lead.has_video ? 'default' : 'secondary'}>
          <Icon name={lead.has_video ? 'Video' : 'FileText'} size={12} className="mr-1" />
          {lead.has_video ? 'Видео' : 'Текст'}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{lead.comments}</p>
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {formatDate(lead.created_at)}
        </p>
        <div className="flex gap-2">
          {lead.has_video && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onLoadVideo(lead.id)}
                disabled={loadingVideo}
              >
                {loadingVideo ? (
                  <Icon name="Loader2" size={12} className="animate-spin mr-1" />
                ) : (
                  <Icon name="Play" size={12} className="mr-1" />
                )}
                Смотреть
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onDownloadVideo(lead.id, lead.title, userName)}
              >
                <Icon name="Download" size={12} className="mr-1" />
                Скачать
              </Button>
            </>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={deletingLeadId === lead.id}
              >
                {deletingLeadId === lead.id ? (
                  <Icon name="Loader2" size={12} className="animate-spin mr-1" />
                ) : (
                  <Icon name="Trash2" size={12} className="mr-1" />
                )}
                Удалить
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
                  onClick={() => onDeleteLead(lead.id, lead.title)}
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