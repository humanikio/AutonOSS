'use client';

import { useState, useEffect } from 'react';
import { Mail, ChevronDown, ChevronUp, Paperclip, Download } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

interface EmailMessageProps {
  id: string;
  subject: string;
  from: string;
  to: string;
  text: string; // Plain text content
  htmlContent?: string; // DEPRECATED: HTML content (old emails)
  htmlStorageUrl?: string; // NEW: URL to HTML in Firebase Storage
  media?: Array<{
    url: string;
    type: string;
    filename?: string;
    isInline?: boolean;
  }>; // NEW: Attachments
  time: string;
  direction: 'inbound' | 'outbound';
  avatarColor: string;
  contactInitials: string;
}

export default function EmailMessage({
  id,
  subject,
  from,
  to,
  text,
  htmlContent,
  htmlStorageUrl,
  media,
  time,
  direction,
  avatarColor,
  contactInitials
}: EmailMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fetchedHtml, setFetchedHtml] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [htmlError, setHtmlError] = useState(false);

  const isOutbound = direction === 'outbound';

  // Fetch HTML from Firebase Storage if URL is provided AND it's a Firebase Storage URL
  useEffect(() => {
    // Only fetch if htmlStorageUrl is a Firebase Storage URL (not Mailgun)
    const isFirebaseUrl = htmlStorageUrl?.includes('firebasestorage.googleapis.com');

    if (htmlStorageUrl && isFirebaseUrl && !fetchedHtml && !loadingHtml && !htmlContent) {
      setLoadingHtml(true);
      fetch(htmlStorageUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch HTML');
          }
          return response.text();
        })
        .then(html => {
          setFetchedHtml(html);
          setLoadingHtml(false);
        })
        .catch(error => {
          console.error('Error fetching HTML from Storage:', error);
          setHtmlError(true);
          setLoadingHtml(false);
        });
    }
  }, [htmlStorageUrl, fetchedHtml, loadingHtml, htmlContent]);

  // Determine which HTML to use: inline > fetched from Storage > null
  // Prioritize inline htmlContent to avoid CORS issues with external storage
  const htmlToRender = htmlContent || fetchedHtml || null;

  // Sanitize HTML content for security
  const sanitizedHtml = htmlToRender ? DOMPurify.sanitize(htmlToRender) : null;

  // Filter non-inline attachments for display
  const attachments = media?.filter(m => !m.isInline) || [];
  
  // Truncate subject for collapsed view
  const truncatedSubject = subject.length > 60 
    ? `${subject.substring(0, 60)}...` 
    : subject;
    
  // Get sender display name
  const senderDisplay = isOutbound ? 'You' : (from.split('@')[0] || from);

  return (
    <div className={`mb-4 ${isOutbound ? 'flex justify-end' : ''}`}>
      <div className={`max-w-4xl ${isOutbound ? 'order-2' : ''}`}>
        {/* Collapsed Email Preview */}
        {!isExpanded && (
          <div 
            onClick={() => setIsExpanded(true)}
            className={`
              border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
              ${isOutbound ? 'bg-blue-50 border-blue-200' : 'bg-white'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                isOutbound ? 'bg-blue-600' : avatarColor
              }`}>
                {isOutbound ? 'Y' : contactInitials}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {senderDisplay}
                  </span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-500">{time}</span>
                </div>
                
                <div className="text-sm font-medium text-gray-900 truncate">
                  {truncatedSubject}
                </div>
                
                {/* Preview of email content */}
                <div className="text-sm text-gray-600 truncate mt-1">
                  {text.substring(0, 100)}...
                </div>
              </div>
              
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Expanded Email View */}
        {isExpanded && (
          <div className={`
            border border-gray-200 rounded-lg overflow-hidden
            ${isOutbound ? 'bg-blue-50 border-blue-200' : 'bg-white'}
          `}>
            {/* Email Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    isOutbound ? 'bg-blue-600' : avatarColor
                  }`}>
                    {isOutbound ? 'Y' : contactInitials}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {from}
                    </div>
                    <div className="text-sm text-gray-600">
                      To: {to}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {time}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              
              {/* Subject */}
              <div className="mt-3">
                <div className="text-lg font-medium text-gray-900">
                  {subject}
                </div>
              </div>
            </div>

            {/* Email Content */}
            <div className="p-4">
              {loadingHtml ? (
                /* Loading state while fetching HTML */
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading email content...</span>
                </div>
              ) : htmlError ? (
                /* Error state if HTML fetch failed */
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  <p className="font-medium">Failed to load email content</p>
                  <p className="text-sm mt-1">Displaying plain text version:</p>
                  <div className="mt-2 whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {text}
                  </div>
                </div>
              ) : sanitizedHtml ? (
                /* Render HTML content in a sandboxed container */
                <div className="email-content">
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6',
                      color: '#374151'
                    }}
                  />
                </div>
              ) : (
                /* Fallback to plain text with basic formatting */
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {text}
                </div>
              )}

              {/* Attachments Section */}
              {attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {attachments.length} {attachments.length === 1 ? 'Attachment' : 'Attachments'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Paperclip className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.filename || `attachment-${index + 1}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {attachment.type}
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}