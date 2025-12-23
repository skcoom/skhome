// Database types for Supabase

export type UserRole = 'admin' | 'staff' | 'partner';
export type ProjectStatus = 'planning' | 'in_progress' | 'completed';
/** @deprecated tagsを使用してください */
export type ProjectCategory = 'apartment' | 'remodeling' | 'new_construction' | 'house';
export type ProjectTag =
  | '全面リフォーム'
  | 'キッチン'
  | '浴室・洗面'
  | 'トイレ'
  | 'リビング・居室'
  | '玄関・廊下'
  | '外壁・屋根'
  | '看板'
  | '住宅'
  | '店舗';
export type MediaType = 'image' | 'video';
export type MediaPhase = 'before' | 'during' | 'after';
export type BlogCategory = 'news' | 'column' | 'case_study';
export type BlogStatus = 'draft' | 'published';
export type ContactStatus = 'pending' | 'in_progress' | 'completed';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_name?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  address?: string;
  /** @deprecated tagsを使用してください */
  category: ProjectCategory;
  tags: ProjectTag[];
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  description?: string;
  is_public: boolean;
  main_media_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMedia {
  id: string;
  project_id: string;
  type: MediaType;
  phase: MediaPhase;
  file_url: string;
  thumbnail_url?: string;
  caption?: string;
  uploaded_by?: string;
  is_featured: boolean;
  hero_position?: 1 | 2 | 3 | null;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  ai_summary?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface ProjectProgress {
  id: string;
  project_id: string;
  date: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  category: BlogCategory;
  status: BlogStatus;
  ai_generated: boolean;
  project_id?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: ContactStatus;
  created_at: string;
}

// Database schema for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;
      };
      project_media: {
        Row: ProjectMedia;
        Insert: Omit<ProjectMedia, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectMedia, 'id' | 'created_at'>>;
      };
      project_documents: {
        Row: ProjectDocument;
        Insert: Omit<ProjectDocument, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectDocument, 'id' | 'created_at'>>;
      };
      project_progress: {
        Row: ProjectProgress;
        Insert: Omit<ProjectProgress, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectProgress, 'id' | 'created_at'>>;
      };
      blog_posts: {
        Row: BlogPost;
        Insert: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, 'id' | 'created_at'>;
        Update: Partial<Omit<Contact, 'id' | 'created_at'>>;
      };
    };
  };
}
