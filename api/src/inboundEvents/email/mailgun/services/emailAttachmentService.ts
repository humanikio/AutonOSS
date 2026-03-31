import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export interface EmailAttachment {
  filename: string;
  contentType: string;
  contentId?: string; // For inline images (CID)
  buffer: Buffer;
}

export interface AttachmentUploadResult {
  firebaseUrl: string;
  storagePath: string;
  contentType: string;
  filename: string;
  contentId?: string;
  isInline: boolean;
}

/**
 * Service for handling email attachments
 * Downloads from Mailgun webhook payload and uploads to Firebase Storage
 * Uses Firebase Admin SDK for storage operations
 */
export class EmailAttachmentService {
  private bucket: ReturnType<typeof admin.storage>;

  constructor() {
    // Get Firebase Storage bucket using Admin SDK
    this.bucket = admin.storage();
  }

  /**
   * Processes and stores an email attachment in Firebase Storage
   * Pattern matches mediaDownloadService but adapted for email attachments
   */
  async processAndStoreAttachment(
    attachment: EmailAttachment,
    tenantId: string,
    contactId: string,
    conversationId: string,
    messageId: string,
    attachmentIndex: number
  ): Promise<AttachmentUploadResult> {
    try {
      console.log(`📎 Processing email attachment: ${attachment.filename} (${attachment.contentType})`);

      // Determine if this is an inline image (has Content-ID)
      const isInline = !!attachment.contentId;

      // Generate file extension from content type or filename
      const extension = this.getFileExtension(attachment.contentType, attachment.filename);

      // Create Firebase Storage path
      // Pattern: conversations/{tenantId}/{contactId}/{conversationId}/messages/{messageId}/attachments/
      const storagePath = `conversations/${tenantId}/${contactId}/${conversationId}/messages/${messageId}/attachments/${attachmentIndex}_${this.sanitizeFilename(attachment.filename)}`;

      // Upload to Firebase Storage
      const firebaseUrl = await this.uploadToFirebaseStorage(
        attachment.buffer,
        storagePath,
        attachment.contentType
      );

      console.log(`✅ Successfully stored attachment at: ${firebaseUrl}`);

      return {
        firebaseUrl,
        storagePath,
        contentType: attachment.contentType,
        filename: attachment.filename,
        contentId: attachment.contentId,
        isInline
      };

    } catch (error) {
      console.error(`❌ Error processing email attachment:`, error);
      throw new Error(`Failed to process attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stores HTML content in Firebase Storage
   */
  async storeHtmlContent(
    htmlContent: string,
    tenantId: string,
    contactId: string,
    conversationId: string,
    messageId: string
  ): Promise<{ htmlStorageUrl: string; htmlStoragePath: string }> {
    try {
      console.log(`📄 Storing HTML content for message ${messageId}`);

      // Create storage path for HTML
      const storagePath = `conversations/${tenantId}/${contactId}/${conversationId}/messages/${messageId}/email.html`;

      // Convert HTML string to buffer
      const buffer = Buffer.from(htmlContent, 'utf-8');

      // Upload to Firebase Storage
      const htmlStorageUrl = await this.uploadToFirebaseStorage(
        buffer,
        storagePath,
        'text/html'
      );

      console.log(`✅ Successfully stored HTML at: ${htmlStorageUrl}`);

      return {
        htmlStorageUrl,
        htmlStoragePath: storagePath
      };

    } catch (error) {
      console.error(`❌ Error storing HTML content:`, error);
      throw new Error(`Failed to store HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Uploads buffer to Firebase Storage and returns public URL
   * Uses Firebase Admin SDK
   */
  private async uploadToFirebaseStorage(
    buffer: Buffer,
    storagePath: string,
    contentType: string
  ): Promise<string> {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET not configured');
    }

    const bucket = this.bucket.bucket(bucketName);
    const file = bucket.file(storagePath);

    console.log(`☁️ Uploading to Firebase Storage: ${storagePath}`);

    // Upload the file using Firebase Admin SDK
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          source: 'mailgun-email',
          uploadedAt: new Date().toISOString()
        }
      },
      validation: 'crc32c'
    });

    // Generate public URL
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media`;

    console.log(`🌐 Generated public URL: ${publicUrl}`);

    return publicUrl;
  }

  /**
   * Converts MIME type or filename to file extension
   */
  private getFileExtension(contentType: string, filename: string): string {
    // Try to extract from filename first
    const filenameParts = filename.split('.');
    if (filenameParts.length > 1) {
      return filenameParts[filenameParts.length - 1];
    }

    // Fallback to content type mapping
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'text/html': 'html',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/zip': 'zip',
      'application/x-zip-compressed': 'zip'
    };

    return extensions[contentType.toLowerCase()] || 'bin';
  }

  /**
   * Sanitizes filename for safe storage
   */
  private sanitizeFilename(filename: string): string {
    // Remove dangerous characters and spaces
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255); // Limit filename length
  }

  /**
   * Delete attachment from Firebase Storage (cleanup utility)
   */
  async deleteAttachment(storagePath: string): Promise<void> {
    try {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
      if (!bucketName) {
        throw new Error('FIREBASE_STORAGE_BUCKET not configured');
      }

      const bucket = this.bucket.bucket(bucketName);
      const file = bucket.file(storagePath);

      await file.delete();
      console.log(`🗑️ Deleted attachment: ${storagePath}`);
    } catch (error) {
      console.error(`❌ Error deleting attachment: ${storagePath}`, error);
      // Don't throw - deletion failures shouldn't break the app
    }
  }
}

export const emailAttachmentService = new EmailAttachmentService();
