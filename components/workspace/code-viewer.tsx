'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeViewerProps {
  content: string;
  filePath?: string;
  language?: string;
}

// Detect language from file extension
function detectLanguage(filePath?: string): string {
  if (!filePath) return 'text';

  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    // Web
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',

    // Backend
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',

    // Shell/Config
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    env: 'bash',

    // Data
    sql: 'sql',
    graphql: 'graphql',
    xml: 'xml',

    // Docs
    md: 'markdown',
    mdx: 'mdx',
    txt: 'text',
  };

  return languageMap[ext || ''] || 'text';
}

// Get file name from path
function getFileName(filePath?: string): string {
  if (!filePath) return 'output';
  return filePath.split('/').pop() || filePath;
}

export function CodeViewer({ content, filePath, language }: CodeViewerProps) {
  const detectedLanguage = language || detectLanguage(filePath);
  const fileName = getFileName(filePath);

  // Custom dark theme based on the Manus screenshots
  const customStyle: React.CSSProperties = {
    margin: 0,
    padding: '16px',
    borderRadius: '0 0 12px 12px',
    fontSize: '13px',
    lineHeight: '1.6',
    background: '#1e1e1e',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] rounded-xl border border-[#3a3a3a] overflow-hidden">
      {/* File header */}
      <div className="px-4 py-2.5 border-b border-[#3a3a3a] bg-[#252525] flex items-center justify-center">
        <span className="text-[13px] text-text-tertiary">{fileName}</span>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={detectedLanguage}
          style={oneDark}
          customStyle={customStyle}
          showLineNumbers={false}
          wrapLines={true}
          wrapLongLines={true}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
