export interface DirEntry {
  name: string;
  rel_path: string;
  is_dir: boolean;
  size: number;
  children: DirEntry[];
}

export interface FilePreviewData {
  type: 'image' | 'pdf' | 'html' | 'media' | 'binary';
  url?: string;
  content?: string;
  filename?: string;
  size?: number;
}
