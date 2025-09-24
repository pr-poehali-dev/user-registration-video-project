import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface VideoLead {
  id: string;
  title: string;
  comments: string;
  video_url?: string;
  created_at: string;
  video_filename?: string;
}

interface LeadsArchiveProps {
  videoLeads: VideoLead[];
  onCreateLead: () => void;
  onLoadVideo: (leadId: string) => Promise<string | null>;
}

const LeadsArchive: React.FC<LeadsArchiveProps> = ({ 
  videoLeads, 
  onCreateLead,
  onLoadVideo 
}) => {
  if (videoLeads.length === 0) {
    return (
      <Card className="text-center py-8 sm:py-12 animate-fade-in">
        <CardContent className="px-4 sm:px-6">
          <Icon name="Archive" size={48} className="mx-auto mb-3 sm:mb-4 text-gray-300 sm:size-16" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Архив пуст</h3>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            Создайте первый лид, чтобы увидеть его здесь
          </p>
          <Button onClick={onCreateLead} className="text-sm sm:text-base h-9 sm:h-10">
            <Icon name="Plus" size={14} className="mr-2 sm:size-4" />
            Создать лид
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      {videoLeads.map((lead) => (
        <VideoLeadCard key={lead.id} lead={lead} onLoadVideo={onLoadVideo} />
      ))}
    </div>
  );
};

// Separate component for video lead cards to handle async video loading
const VideoLeadCard: React.FC<{ 
  lead: VideoLead; 
  onLoadVideo: (leadId: string) => Promise<string | null>;
}> = ({ lead, onLoadVideo }) => {
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const handleLoadVideo = async () => {
    if (videoDataUrl) return; // Already loaded
    
    setVideoLoading(true);
    const dataUrl = await onLoadVideo(lead.id);
    if (dataUrl) {
      setVideoDataUrl(dataUrl);
    }
    setVideoLoading(false);
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <CardTitle className="text-base sm:text-lg pr-2">{lead.title}</CardTitle>
          <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
            {lead.created_at}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
            {videoDataUrl ? (
              <video
                src={videoDataUrl}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button 
                  onClick={handleLoadVideo} 
                  variant="outline"
                  disabled={videoLoading}
                >
                  {videoLoading ? (
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Icon name="Play" size={16} className="mr-2" />
                  )}
                  Загрузить видео
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Комментарии:</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
              {lead.comments}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadsArchive;