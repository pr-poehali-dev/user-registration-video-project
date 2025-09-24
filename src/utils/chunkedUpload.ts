import { v4 as uuidv4 } from 'uuid';

export interface ChunkedUploadOptions {
  file: Blob;
  title: string;
  comments: string;
  chunkSize?: number;
  token: string;
  uploadUrl: string;
  onProgress?: (progress: number) => void;
  onChunkUploaded?: (chunkIndex: number, totalChunks: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export interface UploadResult {
  success: boolean;
  lead_id?: string;
  error?: string;
  upload_complete?: boolean;
  final_size?: number;
  created_at?: string;
}

export class ChunkedUploader {
  private uploadId: string;
  private options: ChunkedUploadOptions;
  private chunks: Blob[] = [];
  private uploadedChunks: Set<number> = new Set();
  private totalChunks: number = 0;
  private isUploading: boolean = false;
  private abortController: AbortController | null = null;

  constructor(options: ChunkedUploadOptions) {
    this.uploadId = uuidv4();
    this.options = {
      chunkSize: 5 * 1024 * 1024, // 5MB default chunk size
      ...options
    };
  }

  /**
   * Start the chunked upload process
   */
  async upload(): Promise<UploadResult> {
    if (this.isUploading) {
      throw new Error('Upload already in progress');
    }

    this.isUploading = true;
    this.abortController = new AbortController();

    try {
      // Step 1: Split file into chunks
      this.splitFileIntoChunks();
      
      console.log(`Starting chunked upload: ${this.totalChunks} chunks, ${this.options.file.size} bytes total`);

      // Step 2: Initialize upload session
      await this.initializeUploadSession();

      // Step 3: Upload chunks sequentially with retry
      for (let i = 0; i < this.totalChunks; i++) {
        if (this.abortController?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        await this.uploadChunk(i);
        this.options.onChunkUploaded?.(i + 1, this.totalChunks);
        
        const progress = ((i + 1) / this.totalChunks) * 100;
        this.options.onProgress?.(progress);
      }

      console.log('All chunks uploaded successfully');
      return { success: true, upload_complete: true };

    } catch (error: any) {
      console.error('Chunked upload error:', error);
      this.options.onError?.(error.message);
      return { success: false, error: error.message };
    } finally {
      this.isUploading = false;
      this.abortController = null;
    }
  }

  /**
   * Cancel the upload
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isUploading = false;
  }

  /**
   * Split the file into chunks
   */
  private splitFileIntoChunks(): void {
    const { file, chunkSize } = this.options;
    this.chunks = [];
    
    let offset = 0;
    while (offset < file.size) {
      const end = Math.min(offset + chunkSize!, file.size);
      const chunk = file.slice(offset, end);
      this.chunks.push(chunk);
      offset = end;
    }
    
    this.totalChunks = this.chunks.length;
    console.log(`File split into ${this.totalChunks} chunks of ~${chunkSize} bytes each`);
  }

  /**
   * Initialize upload session on the server
   */
  private async initializeUploadSession(): Promise<void> {
    const response = await fetch(this.options.uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': this.options.token
      },
      body: JSON.stringify({
        action: 'start_upload',
        upload_id: this.uploadId,
        total_size: this.options.file.size,
        total_chunks: this.totalChunks,
        filename: 'video.mp4',
        title: this.options.title,
        comments: this.options.comments
      }),
      signal: this.abortController?.signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initialize upload session');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Upload initialization failed');
    }

    console.log('Upload session initialized:', result);
  }

  /**
   * Upload a single chunk with retry logic
   */
  private async uploadChunk(chunkIndex: number, retries: number = 3): Promise<void> {
    const chunk = this.chunks[chunkIndex];
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Convert chunk to base64
        const base64Chunk = await this.blobToBase64(chunk);
        const chunkHash = await this.calculateMD5(chunk);

        const response = await fetch(this.options.uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': this.options.token
          },
          body: JSON.stringify({
            action: 'upload_chunk',
            upload_id: this.uploadId,
            chunk_index: chunkIndex,
            chunk_data: base64Chunk,
            chunk_hash: chunkHash
          }),
          signal: this.abortController?.signal
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to upload chunk ${chunkIndex}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || `Chunk ${chunkIndex} upload failed`);
        }

        console.log(`Chunk ${chunkIndex + 1}/${this.totalChunks} uploaded (${result.progress?.toFixed(1)}%)`);

        // Check if upload is complete
        if (result.upload_complete) {
          console.log('Upload completed on server:', result);
          this.options.onComplete?.(result);
        }

        this.uploadedChunks.add(chunkIndex);
        return; // Success, exit retry loop

      } catch (error: any) {
        console.error(`Chunk ${chunkIndex} upload attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === retries - 1) {
          throw error; // Last attempt failed
        }
        
        // Wait before retry (exponential backoff)
        await this.sleep(1000 * Math.pow(2, attempt));
      }
    }
  }

  /**
   * Convert Blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1]; // Remove data:type;base64, prefix
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Calculate MD5 hash for chunk verification
   */
  private async calculateMD5(blob: Blob): Promise<string> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('MD5', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Fallback for browsers that don't support MD5
      console.warn('MD5 hashing not supported, using simple checksum');
      return this.simpleChecksum(blob);
    }
  }

  /**
   * Simple checksum fallback
   */
  private async simpleChecksum(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let checksum = 0;
    for (let i = 0; i < bytes.length; i++) {
      checksum = (checksum + bytes[i]) % 256;
    }
    return checksum.toString(16).padStart(2, '0');
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get upload progress
   */
  get progress(): number {
    return (this.uploadedChunks.size / this.totalChunks) * 100;
  }

  /**
   * Check if upload is in progress
   */
  get uploading(): boolean {
    return this.isUploading;
  }
}