'use client';

import { useState, useRef, useEffect } from 'react';
import { Monitor, Smartphone, Edit3, Eye, Save, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import ElementToolbar from './ElementToolbar';
import ContactFieldInserter from './ContactFieldInserter';

interface InlineEditorProps {
  htmlCode: string;
  onSave: (editedHtml: string) => void;
  previewMode: 'desktop' | 'mobile';
  onPreviewModeChange: (mode: 'desktop' | 'mobile') => void;
}

export default function InlineEditor({
  htmlCode,
  onSave,
  previewMode,
  onPreviewModeChange
}: InlineEditorProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number; placement: 'above' | 'below'; scrollKey: number }>({ x: 0, y: 0, placement: 'above', scrollKey: 0 });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const originalHtmlRef = useRef<string>(htmlCode);
  const scrollListenerRef = useRef<(() => void) | null>(null);

  // Update original HTML when prop changes (from AI or external save)
  useEffect(() => {
    if (!isEditMode) {
      originalHtmlRef.current = htmlCode;
      setHasUnsavedChanges(false);
    }
  }, [htmlCode, isEditMode]);

  // Calculate toolbar position relative to selected element with smart placement
  const calculateToolbarPosition = (element: HTMLElement) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeRect = iframe.getBoundingClientRect();
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    // Get element's position within the iframe
    const elementRect = element.getBoundingClientRect();

    // Calculate absolute position relative to iframe
    const absoluteX = iframeRect.left + elementRect.left;
    const absoluteY = iframeRect.top + elementRect.top;

    // Toolbar approximate height
    const toolbarHeight = 120;

    // Determine if we should place toolbar above or below
    // Check space above and below the element
    const spaceAbove = elementRect.top;
    const spaceBelow = iframeRect.height - (elementRect.top + elementRect.height);

    // Also check if element is in the upper portion of the viewport
    const viewportHeight = window.innerHeight;
    const elementTopInViewport = absoluteY;

    let placement: 'above' | 'below' = 'above';
    let y = absoluteY - 10; // Default: 10px above element

    // If not enough space above OR element is in upper 30% of viewport, place below
    if (spaceAbove < toolbarHeight || elementTopInViewport < viewportHeight * 0.3) {
      placement = 'below';
      y = absoluteY + elementRect.height + 10; // 10px below element
    }

    setToolbarPosition(prev => ({
      x: absoluteX,
      y: y,
      placement: placement,
      scrollKey: prev.scrollKey + 1 // Increment to force re-render
    }));
  };

  // Handle element click for selection
  const handleElementClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;

    // Don't select body, html, or our edit indicators
    if (
      target.tagName === 'BODY' ||
      target.tagName === 'HTML' ||
      target.id === '__edit-mode-indicator__'
    ) {
      return;
    }

    // Remove previous selection
    if (selectedElement && selectedElement !== target) {
      selectedElement.style.outline = '';
      selectedElement.style.outlineOffset = '';
    }

    // Add selection outline
    target.style.outline = '3px solid #6366f1';
    target.style.outlineOffset = '2px';

    setSelectedElement(target);
    calculateToolbarPosition(target);
  };

  // Handle deselect
  const handleDeselectElement = () => {
    if (selectedElement) {
      selectedElement.style.outline = '';
      selectedElement.style.outlineOffset = '';
    }
    setSelectedElement(null);
  };

  // Handle delete element
  const handleDeleteElement = () => {
    if (!selectedElement) return;

    if (confirm('Delete this element? This cannot be undone.')) {
      selectedElement.remove();
      setSelectedElement(null);
      setHasUnsavedChanges(true);
    }
  };

  // Handle color change
  const handleColorChange = (color: string, type: 'text' | 'background') => {
    if (!selectedElement) return;

    if (type === 'text') {
      selectedElement.style.color = color;
    } else {
      if (color === 'transparent') {
        selectedElement.style.backgroundColor = '';
      } else {
        selectedElement.style.backgroundColor = color;
      }
    }

    setHasUnsavedChanges(true);
  };

  // Handle font size change
  const handleFontSizeChange = (size: string) => {
    if (!selectedElement) return;

    selectedElement.style.fontSize = size;
    setHasUnsavedChanges(true);
  };

  // Handle generic style change
  const handleStyleChange = (property: string, value: string) => {
    if (!selectedElement) return;

    // Convert camelCase to kebab-case
    const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    selectedElement.style.setProperty(cssProperty, value);

    setHasUnsavedChanges(true);
  };

  // Enable edit mode
  const enableEditMode = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const body = iframe.contentDocument.body;
    if (!body) return;

    // Make all text elements editable
    body.setAttribute('contenteditable', 'true');
    body.style.outline = '2px dashed #6366f1';
    body.style.outlineOffset = '4px';

    // Add edit styles to head
    const styleEl = iframe.contentDocument.createElement('style');
    styleEl.id = '__edit-mode-styles__';
    styleEl.textContent = `
      /* Highlight focused editable elements */
      [contenteditable="true"]:focus,
      [contenteditable="true"] *:focus {
        outline: 2px solid #6366f1 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1) !important;
        cursor: text !important;
      }

      /* Show editable areas on hover */
      [contenteditable="true"] p:hover,
      [contenteditable="true"] h1:hover,
      [contenteditable="true"] h2:hover,
      [contenteditable="true"] h3:hover,
      [contenteditable="true"] h4:hover,
      [contenteditable="true"] h5:hover,
      [contenteditable="true"] h6:hover,
      [contenteditable="true"] span:hover,
      [contenteditable="true"] a:hover,
      [contenteditable="true"] td:hover,
      [contenteditable="true"] th:hover,
      [contenteditable="true"] li:hover {
        outline: 1px dashed rgba(99, 102, 241, 0.4) !important;
        outline-offset: 2px !important;
        background: rgba(99, 102, 241, 0.02) !important;
      }

      /* Remove default focus outline */
      [contenteditable="true"] *:focus {
        outline: 2px solid #6366f1 !important;
      }
    `;
    iframe.contentDocument.head.appendChild(styleEl);

    // Add edit indicator
    const editIndicator = iframe.contentDocument.createElement('div');
    editIndicator.id = '__edit-mode-indicator__';
    editIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #6366f1;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      z-index: 999999;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 6px;
    `;

    // Add edit icon (SVG)
    const iconSvg = iframe.contentDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('width', '14');
    iconSvg.setAttribute('height', '14');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('stroke-width', '2');
    iconSvg.setAttribute('stroke-linecap', 'round');
    iconSvg.setAttribute('stroke-linejoin', 'round');
    iconSvg.innerHTML = '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>';

    const textNode = iframe.contentDocument.createTextNode('Edit Mode - Click to Select');

    editIndicator.appendChild(iconSvg);
    editIndicator.appendChild(textNode);
    body.appendChild(editIndicator);

    // Listen for changes
    body.addEventListener('input', handleContentChange);

    // Add click listener for element selection
    body.addEventListener('click', handleElementClick as any);

    // Add escape key listener to deselect
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDeselectElement();
      }
    };
    iframe.contentDocument.addEventListener('keydown', handleKeyDown);

    // Add scroll listener to update toolbar position
    const handleScroll = () => {
      if (selectedElement) {
        calculateToolbarPosition(selectedElement);
      }
    };
    iframe.contentWindow?.addEventListener('scroll', handleScroll);
    scrollListenerRef.current = handleScroll;

    setIsEditMode(true);
    // Store the FULL HTML document
    originalHtmlRef.current = '<!DOCTYPE html>\n' + iframe.contentDocument.documentElement.outerHTML;
  };

  // Disable edit mode
  const disableEditMode = (save = false) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const body = iframe.contentDocument.body;
    if (!body) return;

    // Remove edit mode
    body.removeAttribute('contenteditable');
    body.style.outline = '';
    body.style.outlineOffset = '';

    // Remove edit styles
    const styleEl = iframe.contentDocument.getElementById('__edit-mode-styles__');
    if (styleEl) {
      styleEl.remove();
    }

    // Remove indicator
    const indicator = iframe.contentDocument.getElementById('__edit-mode-indicator__');
    if (indicator) {
      indicator.remove();
    }

    // Remove listeners
    body.removeEventListener('input', handleContentChange);
    body.removeEventListener('click', handleElementClick as any);

    // Remove scroll listener
    if (scrollListenerRef.current && iframe.contentWindow) {
      iframe.contentWindow.removeEventListener('scroll', scrollListenerRef.current);
      scrollListenerRef.current = null;
    }

    // Clear selection
    if (selectedElement) {
      selectedElement.style.outline = '';
      selectedElement.style.outlineOffset = '';
      setSelectedElement(null);
    }

    if (save && hasUnsavedChanges) {
      extractAndSave();
    }

    setIsEditMode(false);
    setHasUnsavedChanges(false);
  };

  // Handle content changes
  const handleContentChange = () => {
    setHasUnsavedChanges(true);
  };

  // Extract HTML from iframe and save
  const extractAndSave = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    console.log('[Inline Editor] Extracting and saving HTML...');

    // Clone the document to clean it without affecting the iframe
    const doc = iframe.contentDocument;
    const clonedHtml = doc.documentElement.cloneNode(true) as HTMLElement;

    // Create a temporary container to work with
    const tempDoc = document.implementation.createHTMLDocument();
    tempDoc.documentElement.innerHTML = clonedHtml.innerHTML;
    tempDoc.documentElement.setAttribute('lang', clonedHtml.getAttribute('lang') || 'en');

    // Remove our edit mode artifacts
    const indicator = tempDoc.getElementById('__edit-mode-indicator__');
    if (indicator) {
      indicator.remove();
    }

    const styleEl = tempDoc.getElementById('__edit-mode-styles__');
    if (styleEl) {
      styleEl.remove();
    }

    // Remove contenteditable attributes from body
    const body = tempDoc.body;
    if (body) {
      body.removeAttribute('contenteditable');
      body.style.outline = '';
      body.style.outlineOffset = '';
    }

    // Remove any lingering contenteditable or inline styles we added
    const editableElements = tempDoc.querySelectorAll('[contenteditable]');
    editableElements.forEach(el => {
      el.removeAttribute('contenteditable');
    });

    // Remove selection outlines we added
    const allElements = tempDoc.querySelectorAll('*');
    allElements.forEach((el: any) => {
      if (el.style.outline && el.style.outline.includes('#6366f1')) {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });

    // Build the COMPLETE HTML document with DOCTYPE
    const cleanHtml = '<!DOCTYPE html>\n' + tempDoc.documentElement.outerHTML;

    console.log('[Inline Editor] Clean HTML length:', cleanHtml.length);
    console.log('[Inline Editor] First 200 chars:', cleanHtml.substring(0, 200));

    // Save via callback - this will update state and call backend
    onSave(cleanHtml);
    setHasUnsavedChanges(false);
    setIsEditMode(false);
  };

  // Cancel edits
  const cancelEdits = () => {
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      return;
    }
    disableEditMode(false);
  };

  // Handle inserting contact field placeholder
  const handleInsertContactField = (fieldPlaceholder: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument || !iframe?.contentWindow) {
      console.error('Cannot insert field: iframe not available');
      return;
    }

    const iframeDoc = iframe.contentDocument;
    const iframeWin = iframe.contentWindow;

    // Get the current selection in the iframe
    const selection = iframeWin.getSelection();

    if (!selection || selection.rangeCount === 0) {
      // If no selection, try to insert at the end of the selected element
      if (selectedElement) {
        const textContent = selectedElement.textContent || '';
        selectedElement.textContent = textContent + ' ' + fieldPlaceholder;
        setHasUnsavedChanges(true);
        return;
      }

      // Otherwise, just append to body
      const body = iframeDoc.body;
      if (body) {
        const span = iframeDoc.createElement('span');
        span.textContent = ' ' + fieldPlaceholder + ' ';
        body.appendChild(span);
        setHasUnsavedChanges(true);
      }
      return;
    }

    // Insert at cursor position
    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Create a text node with the placeholder
    const textNode = iframeDoc.createTextNode(fieldPlaceholder);
    range.insertNode(textNode);

    // Move cursor after the inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    setHasUnsavedChanges(true);

    console.log('[Inline Editor] Inserted contact field:', fieldPlaceholder);
  };

  return (
    <div className="w-[700px] backdrop-blur-xl bg-white/90 border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            {isEditMode ? (
              <span className="flex items-center gap-2 text-primary-600">
                <Edit3 className="h-4 w-4" />
                Editing Template
              </span>
            ) : (
              'Preview'
            )}
          </h3>

          <div className="flex items-center gap-3">
            {/* Preview Mode Toggle */}
            {!isEditMode && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onPreviewModeChange('desktop')}
                  className={`p-2 rounded transition-colors ${
                    previewMode === 'desktop'
                      ? 'bg-white shadow-sm text-primary-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onPreviewModeChange('mobile')}
                  className={`p-2 rounded transition-colors ${
                    previewMode === 'mobile'
                      ? 'bg-white shadow-sm text-primary-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Edit Mode Controls */}
            {isEditMode ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEdits}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={extractAndSave}
                  disabled={!hasUnsavedChanges}
                  className="px-3 py-1.5 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            ) : (
              <button
                onClick={enableEditMode}
                className="px-3 py-1.5 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                <Edit3 className="h-4 w-4" />
                Edit Template
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contact Field Inserter Toolbar - Only shown in edit mode */}
      {isEditMode && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-700 mb-1">
                Insert Contact Fields
              </p>
              <p className="text-xs text-gray-500">
                Click where you want to insert, then select a field
              </p>
            </div>
            <ContactFieldInserter onInsertField={handleInsertContactField} />
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <p className="text-xs text-amber-800 font-medium">
            ⚠️ You have unsaved changes. Click "Save Changes" to keep your edits.
          </p>
        </div>
      )}

      {/* Preview/Editor */}
      <div className="flex-1 p-3 overflow-auto bg-gray-100">
        <div className={`mx-auto bg-white rounded-lg shadow-lg overflow-hidden transition-all ${
          previewMode === 'desktop' ? 'w-full' : 'w-[375px]'
        }`}>
          <iframe
            ref={iframeRef}
            srcDoc={htmlCode}
            className="w-full border-0"
            style={{ height: 'calc(100vh - 160px)', minHeight: '650px' }}
            title="Email Preview"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>

      {/* Element Toolbar (rendered via portal when element is selected) */}
      {isEditMode && selectedElement && typeof window !== 'undefined' && createPortal(
        <ElementToolbar
          selectedElement={selectedElement}
          position={toolbarPosition}
          onDelete={handleDeleteElement}
          onColorChange={handleColorChange}
          onFontSizeChange={handleFontSizeChange}
          onStyleChange={handleStyleChange}
          onClose={handleDeselectElement}
        />,
        document.body
      )}
    </div>
  );
}
