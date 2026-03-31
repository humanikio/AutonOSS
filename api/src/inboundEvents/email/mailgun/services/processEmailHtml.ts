import { AttachmentUploadResult, emailAttachmentService } from './emailAttachmentService';

export interface ContentIdMapping {
  [contentId: string]: string; // Maps CID to attachment filename
}

export interface ProcessedHtmlResult {
  htmlStorageUrl: string;
  htmlStoragePath: string;
  processedHtml: string;
}

/**
 * Service for processing email HTML content
 * Handles CID (Content-ID) replacement for inline images
 * Stores processed HTML in Firebase Storage
 */
export class ProcessEmailHtmlService {
  /**
   * Process HTML content by replacing CID references with Firebase Storage URLs
   *
   * Email HTML often contains inline images referenced as:
   * <img src="cid:unique-id@domain.com">
   *
   * We need to:
   * 1. Find all CID references in HTML
   * 2. Map them to uploaded attachment URLs
   * 3. Replace CID with Firebase Storage URL
   * 4. Store processed HTML in Firebase Storage
   */
  async processAndStoreHtml(
    htmlContent: string | undefined,
    contentIdMap: ContentIdMapping | undefined,
    uploadedAttachments: AttachmentUploadResult[],
    tenantId: string,
    contactId: string,
    conversationId: string,
    messageId: string
  ): Promise<ProcessedHtmlResult | null> {
    // Return null if no HTML content
    if (!htmlContent) {
      console.log('📄 No HTML content to process');
      return null;
    }

    try {
      console.log('🔄 Processing email HTML content...');

      // Step 1: Replace all CID references with Firebase Storage URLs
      let processedHtml = htmlContent;

      if (contentIdMap && Object.keys(contentIdMap).length > 0) {
        console.log(`🔗 Found ${Object.keys(contentIdMap).length} content-id mappings`);
        processedHtml = this.replaceCidReferences(htmlContent, contentIdMap, uploadedAttachments);
      } else {
        console.log('📄 No content-id mappings found, HTML will be stored as-is');
      }

      // Step 2: Store processed HTML in Firebase Storage
      const { htmlStorageUrl, htmlStoragePath } = await emailAttachmentService.storeHtmlContent(
        processedHtml,
        tenantId,
        contactId,
        conversationId,
        messageId
      );

      console.log(`✅ Successfully processed and stored HTML`);

      return {
        htmlStorageUrl,
        htmlStoragePath,
        processedHtml
      };

    } catch (error) {
      console.error('❌ Error processing HTML content:', error);

      // Fallback: Store original HTML if processing fails
      try {
        console.log('⚠️ Storing original HTML as fallback...');
        const { htmlStorageUrl, htmlStoragePath } = await emailAttachmentService.storeHtmlContent(
          htmlContent,
          tenantId,
          contactId,
          conversationId,
          messageId
        );

        return {
          htmlStorageUrl,
          htmlStoragePath,
          processedHtml: htmlContent
        };
      } catch (fallbackError) {
        console.error('❌ Failed to store HTML even as fallback:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Replace all CID references in HTML with Firebase Storage URLs
   *
   * Supports multiple CID formats:
   * - cid:unique-id@domain.com
   * - cid:unique-id
   * - <unique-id@domain.com>
   */
  private replaceCidReferences(
    html: string,
    contentIdMap: ContentIdMapping,
    uploadedAttachments: AttachmentUploadResult[]
  ): string {
    let processedHtml = html;

    // Build a mapping from Content-ID to Firebase Storage URL
    const cidToUrlMap = new Map<string, string>();

    // Process each uploaded attachment
    for (const attachment of uploadedAttachments) {
      if (attachment.contentId && attachment.isInline) {
        // Normalize the Content-ID (remove < and > if present)
        const normalizedCid = attachment.contentId.replace(/^<|>$/g, '');
        cidToUrlMap.set(normalizedCid, attachment.firebaseUrl);

        console.log(`🔗 Mapped CID ${normalizedCid} → ${attachment.firebaseUrl}`);
      }
    }

    // Find and replace all CID references
    // Pattern 1: src="cid:xxx@domain.com"
    processedHtml = processedHtml.replace(
      /src=["']cid:([^"']+)["']/gi,
      (match, cid) => {
        const url = cidToUrlMap.get(cid);
        if (url) {
          console.log(`✅ Replaced CID reference: cid:${cid} → ${url}`);
          return `src="${url}"`;
        }
        console.warn(`⚠️ CID not found in attachments: ${cid}`);
        return match; // Keep original if not found
      }
    );

    // Pattern 2: src="cid:xxx" (without domain)
    processedHtml = processedHtml.replace(
      /src=["']cid:([^@"']+)["']/gi,
      (match, cid) => {
        // Try to find matching CID (with or without domain)
        for (const [fullCid, url] of cidToUrlMap.entries()) {
          if (fullCid.startsWith(cid)) {
            console.log(`✅ Replaced CID reference: cid:${cid} → ${url}`);
            return `src="${url}"`;
          }
        }
        console.warn(`⚠️ CID not found in attachments: ${cid}`);
        return match;
      }
    );

    // Pattern 3: Handle background-image CSS properties with CID
    processedHtml = processedHtml.replace(
      /background-image:\s*url\(["']?cid:([^"')]+)["']?\)/gi,
      (match, cid) => {
        const url = cidToUrlMap.get(cid);
        if (url) {
          console.log(`✅ Replaced CID in CSS: cid:${cid} → ${url}`);
          return `background-image: url("${url}")`;
        }
        console.warn(`⚠️ CID not found in attachments: ${cid}`);
        return match;
      }
    );

    return processedHtml;
  }

  /**
   * Parse Mailgun's content-id-map JSON string
   * Format: {"<unique-id@domain.com>": "attachment-1", ...}
   */
  parseContentIdMap(contentIdMapString: string | undefined): ContentIdMapping | undefined {
    if (!contentIdMapString) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(contentIdMapString);
      console.log(`📋 Parsed content-id-map:`, parsed);
      return parsed;
    } catch (error) {
      console.error('❌ Failed to parse content-id-map:', error);
      return undefined;
    }
  }
}

export const processEmailHtmlService = new ProcessEmailHtmlService();
