'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Code,
  ImageIcon,
  Sparkles,
  Save,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import ChatInterface from './components/ChatInterface';
import TemplateImageBrowser from './components/TemplateImageBrowser';
import InlineEditor from './components/InlineEditor';
import { db } from '@/lib/firebase/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

type EditorMode = 'html' | 'images' | 'ai';
type PreviewMode = 'desktop' | 'mobile';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #6366f1; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                Hello there,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                This is a sample email template. You can customize this content to match your brand and message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export default function EmailTemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { currentTenantId, getToken } = useAuth();

  const templateId = params.id as string;
  const initialMode = (searchParams.get('mode') as EditorMode) || 'ai';

  const [editorMode, setEditorMode] = useState<EditorMode>(initialMode);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [templateStatus, setTemplateStatus] = useState<'draft' | 'published'>('draft');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editorModes = [
    {
      id: 'ai' as EditorMode,
      name: 'AI Builder',
      icon: Sparkles,
      description: 'Generate with AI'
    },
    {
      id: 'html' as EditorMode,
      name: 'HTML',
      icon: Code,
      description: 'Code editor'
    },
    {
      id: 'images' as EditorMode,
      name: 'Images',
      icon: ImageIcon,
      description: 'Upload assets'
    }
  ];

  // Real-time listener for template data
  useEffect(() => {
    if (!templateId || !currentTenantId) return;

    console.log('[Template Editor] Setting up template listener for:', templateId);
    setIsLoading(true);

    const templateRef = doc(
      db,
      'tenants', currentTenantId,
      'emailTemplates', templateId
    );

    const unsubscribe = onSnapshot(templateRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        console.log('[Template Editor] Template updated');
        setTemplateName(data.name || 'Untitled Template');
        setTemplateStatus(data.status || 'draft');
        setHtmlCode(data.htmlContent || DEFAULT_HTML);
        setAiPrompt(data.aiPrompt || '');
      } else {
        console.error('[Template Editor] Template not found');
      }
      setIsLoading(false);
    }, (error) => {
      console.error('[Template Editor] Error loading template:', error);
      alert('Error loading template');
      setIsLoading(false);
    });

    return () => {
      console.log('[Template Editor] Cleaning up template listener');
      unsubscribe();
    };
  }, [templateId, currentTenantId]);

  // Auto-save functionality
  const saveTemplate = async (skipDebounce = false, overrideHtml?: string) => {
    if (!currentTenantId || !templateId) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const performSave = async () => {
      setIsSaving(true);

      // Use override HTML if provided (for inline edits), otherwise use state
      const htmlToSave = overrideHtml !== undefined ? overrideHtml : htmlCode;

      console.log('[Save Template] HTML to save length:', htmlToSave.length);
      console.log('[Save Template] Sending PATCH request...');

      try {
        const token = await getToken();
        const response = await fetch(`/api/email-templates/${templateId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenantId: currentTenantId,
            name: templateName,
            htmlContent: htmlToSave,
            aiPrompt: aiPrompt
          })
        });

        if (response.ok) {
          setLastSaved(new Date());
          console.log('[Save Template] ✓ Template saved successfully');
        } else {
          console.error('[Save Template] ❌ Failed to save template:', response.status);
        }
      } catch (error) {
        console.error('[Save Template] ❌ Error saving template:', error);
      } finally {
        setIsSaving(false);
      }
    };

    if (skipDebounce) {
      performSave();
    } else {
      // Debounce auto-save by 2 seconds
      saveTimeoutRef.current = setTimeout(performSave, 2000);
    }
  };

  // Auto-save when content changes
  useEffect(() => {
    if (!isLoading) {
      saveTemplate();
    }
  }, [htmlCode, aiPrompt, templateName]);

  // Handle inline editor saves
  const handleInlineEditorSave = async (editedHtml: string) => {
    console.log('[Template Editor] 📝 Saving inline edits...');
    console.log('[Template Editor] HTML length:', editedHtml.length);
    console.log('[Template Editor] Starts with DOCTYPE:', editedHtml.startsWith('<!DOCTYPE'));
    console.log('[Template Editor] First 300 chars:', editedHtml.substring(0, 300));

    // Update state with the COMPLETE HTML
    setHtmlCode(editedHtml);

    // Force immediate save with the FULL edited HTML passed directly
    // This bypasses state update delays and ensures we send the complete document
    await saveTemplate(true, editedHtml);

    console.log('[Template Editor] ✓ Inline edit saved to backend');
  };

  const handleToggleStatus = async () => {
    if (!currentTenantId) return;

    const newStatus = templateStatus === 'published' ? 'draft' : 'published';

    try {
      const token = await getToken();
      const response = await fetch(`/api/email-templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          status: newStatus
        })
      });

      if (response.ok) {
        setTemplateStatus(newStatus);
      } else {
        console.error('Failed to update template status');
        alert('Failed to update template status');
      }
    } catch (error) {
      console.error('Error updating template status:', error);
      alert('Error updating template status');
    }
  };

  const handleAIGenerate = () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      setHtmlCode(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Generated Template</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f0f9ff;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 60px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 16px 0; font-size: 32px;">AI Generated Email</h1>
              <p style="color: #f3f4f6; margin: 0; font-size: 18px;">Based on your prompt: "${aiPrompt}"</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                This template was generated using AI based on your description. You can further customize it in the HTML editor.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`);
      setIsGenerating(false);
      setEditorMode('html');
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Header Bar */}
      <div className="backdrop-blur-xl bg-white/90 border-b border-gray-200 shadow-sm z-10">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Back button and template name */}
            <div className="flex items-center gap-4 flex-1">
              <Link
                href="/creativehub/email-templates"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="flex-1">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="text-lg font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 px-2 py-1 hover:bg-gray-50 rounded w-full max-w-sm"
                />
                <p className="text-xs text-gray-500 px-2">
                  {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Email Template Studio'}
                </p>
              </div>
            </div>

            {/* Center: Editor Mode Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              {editorModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setEditorMode(mode.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
                    editorMode === mode.id
                      ? 'bg-white shadow-sm text-primary-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={mode.description}
                >
                  <mode.icon className="h-4 w-4" />
                  <span>{mode.name}</span>
                </button>
              ))}
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-4 flex-1 justify-end">
              {/* Publish Toggle Switch */}
              <div className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                <span className={`text-sm font-medium ${
                  templateStatus === 'published' ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {templateStatus === 'published' ? 'Published' : 'Draft'}
                </span>
                <button
                  onClick={handleToggleStatus}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    templateStatus === 'published'
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                  title={templateStatus === 'published' ? 'Click to unpublish' : 'Click to publish'}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                      templateStatus === 'published' ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={() => saveTemplate(true)}
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          <div className="flex-1 p-4 overflow-auto">
            {/* HTML Editor */}
            {editorMode === 'html' && (
              <div className="h-full">
                <div className="backdrop-blur-xl bg-white/90 border border-gray-200 rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <Code className="h-5 w-5 text-primary-600" />
                          HTML Editor
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Edit your email template HTML directly
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg">
                          <span className="font-medium text-gray-500">Lines:</span>
                          <span className="font-mono text-gray-900">
                            {htmlCode.split('\n').length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg">
                          <span className="font-medium text-gray-500">Chars:</span>
                          <span className="font-mono text-gray-900">
                            {htmlCode.length.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="flex-1 overflow-hidden relative">
                    <textarea
                      value={htmlCode}
                      onChange={(e) => setHtmlCode(e.target.value)}
                      className="w-full h-full font-mono text-[13px] bg-white p-6 focus:outline-none resize-none text-gray-800 leading-relaxed"
                      spellCheck={false}
                      placeholder="<!-- Enter your HTML code here -->"
                      style={{
                        tabSize: 2,
                        fontFamily: "'Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Courier New', monospace"
                      }}
                    />

                    {/* Subtle grid pattern background */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-[0.02]"
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px'
                      }}
                    />
                  </div>

                  {/* Footer with tips */}
                  <div className="px-4 py-2 border-t border-gray-200 bg-gray-50/50">
                    <div className="flex items-center justify-between text-xs">
                      <p className="text-gray-500 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Auto-save enabled
                      </p>
                      <p className="text-gray-400">
                        Use Tab key for indentation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Template Images */}
            {editorMode === 'images' && (
              <TemplateImageBrowser templateId={templateId} />
            )}

            {/* AI Builder */}
            {editorMode === 'ai' && (
              <div className="h-full">
                <ChatInterface
                  templateId={templateId}
                  initialPrompt={aiPrompt}
                  onHtmlGenerated={(html) => {
                    setHtmlCode(html);
                    setEditorMode('html');
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel with Inline Editor */}
        <InlineEditor
          htmlCode={htmlCode}
          onSave={handleInlineEditorSave}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
        />
      </div>
    </div>
  );
}
