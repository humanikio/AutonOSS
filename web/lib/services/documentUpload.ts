import { storage } from '@/lib/firebase/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
  storagePath: string;
}

export class DocumentUploadService {
  private static getStoragePath(tenantId: string, documentId: string, fileName: string): string {
    return `tenants/${tenantId}/uploadedDocuments/${documentId}/${fileName}`;
  }

  static async uploadDocument(
    file: File,
    tenantId: string
  ): Promise<UploadedDocument> {
    try {
      const documentId = uuidv4();
      const timestamp = new Date().toISOString();
      const fileName = `${timestamp}-${file.name}`;
      const storagePath = this.getStoragePath(tenantId, documentId, fileName);
      
      // Create storage reference
      const storageRef = ref(storage, storagePath);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      const uploadedDocument: UploadedDocument = {
        id: documentId,
        fileName,
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: timestamp,
        downloadUrl,
        storagePath
      };
      
      return uploadedDocument;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error('Failed to upload document');
    }
  }

  static async deleteDocument(
    tenantId: string,
    documentId: string,
    fileName: string
  ): Promise<void> {
    try {
      const storagePath = this.getStoragePath(tenantId, documentId, fileName);
      const storageRef = ref(storage, storagePath);
      
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  }

  static async listDocuments(tenantId: string): Promise<UploadedDocument[]> {
    try {
      const uploadedDocsRef = ref(storage, `tenants/${tenantId}/uploadedDocuments`);
      const result = await listAll(uploadedDocsRef);
      
      const documents: UploadedDocument[] = [];
      
      for (const folderRef of result.prefixes) {
        const folderResult = await listAll(folderRef);
        
        for (const itemRef of folderResult.items) {
          try {
            const downloadUrl = await getDownloadURL(itemRef);
            const pathParts = itemRef.fullPath.split('/');
            const documentId = pathParts[pathParts.length - 2];
            const fileName = pathParts[pathParts.length - 1];
            
            // Extract timestamp and original name from filename
            const timestampMatch = fileName.match(/^([^-]+)-(.+)$/);
            const uploadedAt = timestampMatch ? timestampMatch[1] : new Date().toISOString();
            const originalName = timestampMatch ? timestampMatch[2] : fileName;
            
            // Get file metadata (this is a simplified approach)
            documents.push({
              id: documentId,
              fileName,
              originalName,
              fileType: 'unknown', // We'd need to store this separately or infer from extension
              fileSize: 0, // We'd need to store this separately
              uploadedAt,
              downloadUrl,
              storagePath: itemRef.fullPath
            });
          } catch (error) {
            console.error('Error getting document metadata:', error);
          }
        }
      }
      
      return documents.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } catch (error) {
      console.error('Error listing documents:', error);
      throw new Error('Failed to list documents');
    }
  }

  static async getDocument(downloadUrl: string): Promise<Blob> {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Error fetching document:', error);
      throw new Error('Failed to fetch document');
    }
  }

  static getFileIcon(fileType: string): string {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📄';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊';
    return '📎';
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}