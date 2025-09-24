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
        <CardContent className="px-4">
          <Icon name="Archive" size={48} className="mx-auto mb-4 text-gray-300 sm:w-16 sm:h-16" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Архив пуст</h3>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            Создайте первый лид, чтобы увидеть его здесь
          </p>
          <Button onClick={onCreateLead} className="h-12 sm:h-10 px-6 text-base sm:text-sm font-medium touch-manipulation">
            <Icon name="Plus" size={16} className="mr-2" />
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
        <div className="flex justify-between items-start gap-3">
          <CardTitle className="text-base sm:text-lg leading-tight">{lead.title}</CardTitle>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {lead.created_at}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative touch-manipulation">
            {videoDataUrl ? (
              <video
                src={videoDataUrl}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Button 
                  onClick={handleLoadVideo} 
                  variant="outline"
                  disabled={videoLoading}
                  className="h-12 sm:h-10 px-4 text-base sm:text-sm font-medium touch-manipulation"
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
          <div className="space-y-2 sm:space-y-3">
            <h4 className="font-medium text-sm sm:text-base">Комментарии:</h4>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 sm:p-4 rounded-md whitespace-pre-wrap leading-relaxed max-h-40 sm:max-h-48 overflow-y-auto">
              {lead.comments}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadsArchive;