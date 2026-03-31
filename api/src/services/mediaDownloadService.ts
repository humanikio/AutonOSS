import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Import node-fetch without types to avoid production build issues
const fetch = require('node-fetch');

export interface MediaDownloadResult {
  firebaseUrl: string;
  storagePath: string;
  contentType: string;
  originalUrl: string;
}

export class MediaDownloadService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    // Initialize Google Cloud Storage with Firebase credentials
    this.storage = new Storage({
      projectId: process.env.FIREBASE_PROJECT_ID,
      keyFilename: undefined, // Use service account from environment
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }
    });
    
    this.bucketName = process.env.FIREBASE_STORAGE_BUCKET || '';
    
    if (!this.bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET environment variable is required');
    }
  }

  /**
   * Downloads media from Twilio URL using Basic Auth and uploads to Firebase Storage
   */
  async downloadAndStoreMedia(
    twilioUrl: string,
    tenantId: string,
    contactId: string,
    conversationId: string,
    messageId: string,
    mediaIndex: number,
    contentType: string
  ): Promise<MediaDownloadResult> {
    try {
      console.log(`📥 Downloading media from Twilio: ${twilioUrl}`);

      // Step 1: Download from Twilio with Basic Auth
      const mediaBuffer = await this.downloadFromTwilio(twilioUrl);
      
      // Step 2: Generate file extension from content type
      const extension = this.getFileExtension(contentType);
      
      // Step 3: Create Firebase Storage path
      const storagePath = `conversations/${tenantId}/${contactId}/${conversationId}/messages/${messageId}/media_${mediaIndex}.${extension}`;
      
      // Step 4: Upload to Firebase Storage
      const firebaseUrl = await this.uploadToFirebaseStorage(
        mediaBuffer, 
        storagePath, 
        contentType
      );

      console.log(`✅ Successfully stored media at: ${firebaseUrl}`);

      return {
        firebaseUrl,
        storagePath,
        contentType,
        originalUrl: twilioUrl
      };

    } catch (error) {
      console.error(`❌ Error downloading and storing media:`, error);
      throw new Error(`Failed to process media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Downloads media from Twilio using Basic Authentication
   */
  private async downloadFromTwilio(twilioUrl: string): Promise<Buffer> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not found in environment variables');
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    console.log(`🔐 Downloading from Twilio with Basic Auth...`);

    const response = await fetch(twilioUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'Pulseline-Backend/1.0'
      },
      timeout: 30000 // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Twilio media download failed: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.buffer();
    console.log(`📦 Downloaded ${buffer.length} bytes from Twilio`);
    
    return buffer;
  }

  /**
   * Uploads buffer to Firebase Storage and returns public URL
   */
  private async uploadToFirebaseStorage(
    buffer: Buffer,
    storagePath: string,
    contentType: string
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(storagePath);

    console.log(`☁️ Uploading to Firebase Storage: ${storagePath}`);

    // Upload the file (without legacy ACL for uniform bucket-level access)
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          source: 'twilio-media',
          uploadedAt: new Date().toISOString()
        }
      },
      validation: 'crc32c'
      // Remove public: true - conflicts with uniform bucket-level access
    });

    // Note: File access is controlled by Firebase Storage Rules, not individual ACLs

    // Generate public URL
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o/${encodeURIComponent(storagePath)}?alt=media`;
    
    console.log(`🌐 Generated public URL: ${publicUrl}`);
    
    return publicUrl;
  }

  /**
   * Converts MIME type to file extension
   */
  private getFileExtension(contentType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };

    return extensions[contentType.toLowerCase()] || 'bin';
  }

  /**
   * Delete media from Firebase Storage (cleanup utility)
   */
  async deleteMedia(storagePath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(storagePath);
      
      await file.delete();
      console.log(`🗑️ Deleted media: ${storagePath}`);
    } catch (error) {
      console.error(`❌ Error deleting media: ${storagePath}`, error);
      // Don't throw - deletion failures shouldn't break the app
    }
  }
}

export const mediaDownloadService = new MediaDownloadService();