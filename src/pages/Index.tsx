import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LeadFormData, VideoLead } from '@/types/lead';

// Components
import AuthForm from '@/components/AuthForm';
import AppHeader from '@/components/AppHeader';
import AdminPanel from '@/components/AdminPanel';
import UploadPage from '@/components/UploadPage';
import TabsNavigation from '@/components/TabsNavigation';
import ArchivePasswordDialog from '@/components/ArchivePasswordDialog';
import { useLeadUploadHandler } from '@/components/LeadUploadHandler';

// API URLs
const API_URLS = {
  auth: 'https://functions.poehali.dev/080ec769-925f-4132-8cd3-549c89bdc4c0',
  leads: 'https://functions.poehali.dev/a119ce14-9a5b-40de-b18f-3ef1f6dc7484',
  video: 'https://functions.poehali.dev/75e3022c-965a-4cd9-b5c1-bd179806e509',
  admin: 'https://functions.poehali.dev/bf64fc6c-c075-4df6-beb9-f5b527586fa1',
  adminVideo: 'https://functions.poehali.dev/72f44b46-a11c-4ea3-addb-cb69aee5546e',
  chunkedUpload: 'https://functions.poehali.dev/00f46d6e-5445-4f13-8032-e95041773736',
  deleteUser: 'https://functions.poehali.dev/d99ce676-54d7-46f7-8738-a2dd9264061e',
  editUser: 'https://functions.poehali.dev/d99ce676-54d7-46f7-8738-a2dd9264061e'
};

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}



const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');
  const [videoLeads, setVideoLeads] = useState<VideoLead[]>([]);
  const [activeTab, setActiveTab] = useState('record');
  const [loading, setLoading] = useState(false);
  const [externalUploadProgress, setExternalUploadProgress] = useState<number | undefined>(undefined);
  const [archivePassword, setArchivePassword] = useState('');
  const [showUploadPage, setShowUploadPage] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isArchiveUnlocked, setIsArchiveUnlocked] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  const { toast } = useToast();

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user_data');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        loadUserLeads(savedToken);
      } catch (error) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }
  }, []);

  const loadUserLeads = async (authToken: string) => {
    try {
      const response = await fetch(API_URLS.leads, {
        method: 'GET',
        headers: {
          'X-Auth-Token': authToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideoLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    }
  };

  const handleAuthSuccess = async (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    
    // Store token and user data
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user_data', JSON.stringify(userData));
    
    // Load user leads only for regular users, not admin
    if (userData.role !== 'admin') {
      await loadUserLeads(authToken);
    }
  };

  // Initialize upload handler
  const { handleSaveLead: uploadLead } = useLeadUploadHandler({
    token,
    apiUrls: {
      leads: API_URLS.leads,
      chunkedUpload: API_URLS.chunkedUpload
    },
    onProgress: setExternalUploadProgress,
    onLoadLeads: loadUserLeads
  });

  const handleSaveLead = async (videoBlob: Blob, leadData: LeadFormData) => {
    setShowUploadPage(true);
    setUploadComplete(false);
    setLoading(true);
    
    try {
      await uploadLead(videoBlob, leadData);
      
      // Show success
      setUploadComplete(true);
      setLoading(false);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: 'Ошибка', 
        description: error.message || 'Не удалось сохранить лид', 
        variant: 'destructive' 
      });
      setLoading(false);
      setShowUploadPage(false);
    }
  };

  const loadVideoForLead = async (leadId: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URLS.video}?id=${leadId}`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.video_url || null;
      }
    } catch (error) {
      console.error('Failed to load video:', error);
    }
    return null;
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    setVideoLeads([]);
    setActiveTab('record');
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    toast({ title: 'Выход выполнен', description: 'До свидания!' });
  };

  const handleCreateLead = () => {
    setActiveTab('record');
  };

  const handleNewLead = () => {
    setShowUploadPage(false);
    setUploadComplete(false);
    setExternalUploadProgress(undefined);
    setActiveTab('record');
  };

  // Handle archive password check
  const handleArchiveAccess = () => {
    if (archivePassword === '955650') {
      setIsArchiveUnlocked(true);
      setShowPasswordDialog(false);
      setActiveTab('archive');
      toast({ title: 'Доступ разрешен', description: 'Добро пожаловать в архив' });
    } else {
      toast({ title: 'Неверный пароль', description: 'Попробуйте еще раз', variant: 'destructive' });
      setArchivePassword('');
    }
  };

  const handleArchiveTabClick = () => {
    if (!isArchiveUnlocked) {
      setShowPasswordDialog(true);
    } else {
      setActiveTab('archive');
    }
  };

  const handlePasswordDialogClose = () => {
    setShowPasswordDialog(false);
    setArchivePassword('');
  };

  if (!user) {
    return (
      <AuthForm 
        onAuthSuccess={handleAuthSuccess}
        apiUrl={API_URLS.auth}
      />
    );
  }

  // Admin interface
  if (user.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5">
        <AppHeader user={user} onLogout={handleLogout} />
        <AdminPanel 
          token={token}
          adminApiUrl={API_URLS.admin}
          videoApiUrl={API_URLS.adminVideo}
          deleteUserApiUrl={API_URLS.deleteUser}
          editUserApiUrl={API_URLS.editUser}
        />
      </div>
    );
  }

  // Show upload page when uploading
  if (showUploadPage) {
    return (
      <UploadPage
        progress={externalUploadProgress ?? 0}
        isComplete={uploadComplete}
        onNewLead={handleNewLead}
      />
    );
  }

  // Regular user interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5">
      <AppHeader user={user} onLogout={handleLogout} />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        <TabsNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          videoLeads={videoLeads}
          isArchiveUnlocked={isArchiveUnlocked}
          loading={loading}
          externalUploadProgress={externalUploadProgress}
          onSaveLead={handleSaveLead}
          onCreateLead={handleCreateLead}
          onLoadVideo={loadVideoForLead}
          onArchiveTabClick={handleArchiveTabClick}
        />
      </div>

      {/* Password Dialog */}
      <ArchivePasswordDialog
        isOpen={showPasswordDialog}
        password={archivePassword}
        onPasswordChange={setArchivePassword}
        onClose={handlePasswordDialogClose}
        onSubmit={handleArchiveAccess}
      />
    </div>
  );
};

export default Index;