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

  // Custom dark theme
  const customStyle: React.CSSProperties = {
    margin: 0,
    padding: '16px',
    fontSize: '13px',
    lineHeight: '1.6',
    background: '#1a1a1a',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    minHeight: '100%',
  };

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden shadow-lg border border-[#3a3a3a]">
      {/* File header - macOS style */}
      <div className="px-4 py-2 bg-[#252525] flex items-center gap-3 border-b border-[#1a1a1a]">
        {/* Traffic lights */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-inner" />
        </div>
        {/* File name */}
        <div className="flex-1 text-center">
          <span className="text-[13px] font-medium text-[#999]">{fileName}</span>
        </div>
        {/* Spacer for symmetry */}
        <div className="w-[52px]" />
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto bg-[#1a1a1a]">
        <SyntaxHighlighter
          language={detectedLanguage}
          style={oneDark}
          customStyle={customStyle}
          showLineNumbers={true}
          wrapLines={true}
          wrapLongLines={true}
          lineNumberStyle={{
            color: '#555',
            paddingRight: '16px',
            minWidth: '40px',
            textAlign: 'right',
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
