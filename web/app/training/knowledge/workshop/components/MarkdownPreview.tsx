'use client';

// Markdown Preview Component
export default function MarkdownPreview({ content }: { content: string }) {
  const parseMarkdown = (text: string) => {
    // Split content into lines for processing
    const lines = text.split('\n');
    const result: React.ReactElement[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Headers
      if (line.startsWith('# ')) {
        result.push(
          <h1 key={currentIndex++} className="text-3xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        result.push(
          <h2 key={currentIndex++} className="text-2xl font-semibold text-gray-900 mt-6 mb-3">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        result.push(
          <h3 key={currentIndex++} className="text-xl font-medium text-gray-900 mt-5 mb-2">
            {line.substring(4)}
          </h3>
        );
      }
      // Bold text
      else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
        result.push(
          <p key={currentIndex++} className="font-semibold text-gray-900 mb-2">
            {line.substring(2, line.length - 2)}
          </p>
        );
      }
      // List items
      else if (line.startsWith('- ') || line.startsWith('• ')) {
        result.push(
          <li key={currentIndex++} className="text-gray-700 mb-1 ml-4">
            {line.substring(2)}
          </li>
        );
      }
      // Numbered lists
      else if (/^\d+\. /.test(line)) {
        const match = line.match(/^\d+\. (.+)/);
        if (match) {
          result.push(
            <li key={currentIndex++} className="text-gray-700 mb-1 ml-4 list-decimal">
              {match[1]}
            </li>
          );
        }
      }
      // Bold inline formatting
      else if (line.includes('**')) {
        const parts = line.split('**');
        const formatted = parts.map((part, index) => 
          index % 2 === 1 ? <strong key={index} className="font-semibold">{part}</strong> : part
        );
        result.push(
          <p key={currentIndex++} className="text-gray-700 mb-2 leading-relaxed">
            {formatted}
          </p>
        );
      }
      // Table rows
      else if (line.includes('|') && line.trim() !== '') {
        if (!line.includes('---')) { // Skip separator lines
          const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
          const isHeader = i > 0 && lines[i + 1] && lines[i + 1].includes('---');
          result.push(
            <tr key={currentIndex++} className={isHeader ? "bg-gray-50" : ""}>
              {cells.map((cell, cellIndex) => 
                isHeader ? (
                  <th key={cellIndex} className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex} className="px-3 py-2 text-gray-700 border-b border-gray-100">
                    {cell}
                  </td>
                )
              )}
            </tr>
          );
        }
      }
      // Empty lines
      else if (line.trim() === '') {
        result.push(<div key={currentIndex++} className="h-3"></div>);
      }
      // Regular paragraphs
      else if (line.trim() !== '') {
        result.push(
          <p key={currentIndex++} className="text-gray-700 mb-3 leading-relaxed">
            {line}
          </p>
        );
      }
    }

    return result;
  };

  const elements = parseMarkdown(content);
  
  // Group table rows
  const groupedElements: React.ReactElement[] = [];
  let currentTable: React.ReactElement[] = [];
  
  elements.forEach((element, index) => {
    if (element.type === 'tr') {
      currentTable.push(element);
    } else {
      if (currentTable.length > 0) {
        groupedElements.push(
          <table key={`table-${index}`} className="w-full border-collapse mb-4 border border-gray-200 rounded-lg overflow-hidden">
            <tbody>{currentTable}</tbody>
          </table>
        );
        currentTable = [];
      }
      groupedElements.push(element);
    }
  });
  
  // Handle remaining table
  if (currentTable.length > 0) {
    groupedElements.push(
      <table key="table-final" className="w-full border-collapse mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <tbody>{currentTable}</tbody>
      </table>
    );
  }

  return <div className="markdown-content">{groupedElements}</div>;
}