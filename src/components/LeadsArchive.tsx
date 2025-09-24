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
      <Card className="text-center py-12 animate-fade-in">
        <CardContent>
          <Icon name="Archive" size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold mb-2">Архив пуст</h3>
          <p className="text-muted-foreground mb-4">
            Создайте первый лид, чтобы увидеть его здесь
          </p>
          <Button onClick={onCreateLead}>
            <Icon name="Plus" size={16} className="mr-2" />
            Создать лид
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
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
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{lead.title}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {lead.created_at}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-4">
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