'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Code blocks with syntax highlighting
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const isBlock = match || codeString.includes('\n');

            if (isBlock) {
              return (
                <div className="relative group my-4">
                  {/* Language badge */}
                  {language && (
                    <div className="absolute top-0 right-0 px-2 py-1 text-[11px] text-[#888] bg-[#1a1a1a] rounded-bl-lg rounded-tr-lg border-l border-b border-[#333] z-10">
                      {language}
                    </div>
                  )}
                  <SyntaxHighlighter
                    style={oneDark}
                    language={language || 'text'}
                    PreTag="div"
                    wrapLines={false}
                    wrapLongLines={true}
                    customStyle={{
                      margin: 0,
                      padding: '16px',
                      paddingTop: language ? '32px' : '16px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      background: '#1a1a1a',
                      border: '1px solid #333',
                    }}
                    codeTagProps={{
                      style: {
                        background: 'transparent',
                      },
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // Inline code
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-[#2a2a2a] text-[#e0e0e0] text-[13px] font-mono border border-[#333]">
                {children}
              </code>
            );
          },

          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-[#333]">
                <table className="w-full text-[14px]">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-[#252525] border-b border-[#333]">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-3 text-left font-semibold text-[#ccc]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-4 py-3 border-t border-[#2a2a2a]">{children}</td>;
          },
          tr({ children }) {
            return <tr className="hover:bg-[#252525] transition-colors">{children}</tr>;
          },

          // Lists
          ul({ children }) {
            return <ul className="list-disc list-outside ml-6 my-3 space-y-1.5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside ml-6 my-3 space-y-1.5">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-[15px] leading-relaxed pl-1">{children}</li>;
          },

          // Headings
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4 text-text-primary">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-3 text-text-primary">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2 text-text-primary">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-base font-semibold mt-3 mb-2 text-text-primary">{children}</h4>;
          },

          // Paragraphs
          p({ children }) {
            return <p className="my-3 leading-relaxed">{children}</p>;
          },

          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-[#444] pl-4 my-4 italic text-[#aaa]">
                {children}
              </blockquote>
            );
          },

          // Horizontal rule
          hr() {
            return <hr className="my-6 border-t border-[#333]" />;
          },

          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {children}
              </a>
            );
          },

          // Strong/Bold
          strong({ children }) {
            return <strong className="font-semibold text-text-primary">{children}</strong>;
          },

          // Emphasis/Italic
          em({ children }) {
            return <em className="italic">{children}</em>;
          },

          // Strikethrough
          del({ children }) {
            return <del className="line-through text-[#888]">{children}</del>;
          },

          // Images
          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt || ''}
                className="max-w-full h-auto rounded-lg my-4 border border-[#333]"
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
