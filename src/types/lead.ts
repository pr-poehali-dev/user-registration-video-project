export interface LeadFormData {
  parentName: string;
  childName: string;
  age: string;
  phone: string;
}

export interface VideoLead {
  id: string;
  title: string;
  comments: string;
  video_url?: string;
  created_at: string;
  video_filename?: string;
}