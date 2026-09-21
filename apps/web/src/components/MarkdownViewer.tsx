import React, { useState, useEffect, useRef, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  Copy,
  Check,
  Eye,
  Code2,
  ListTree,
  ChevronDown,
  ChevronRight,
  Download,
  Terminal,
} from 'lucide-react';
import { downloadTextAsFile, downloadBlob } from '../lib/api';

interface MarkdownViewerProps {
  projectId?: string;
  content: string;
  filename?: string;
  isStreaming?: boolean;
}

// Lazy loaded Mermaid singleton
let mermaidPromise: Promise<any> | null = null;
let isMermaidInit = false;

const getMermaid = async () => {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default || mod;
      if (!isMermaidInit) {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            suppressErrorRendering: true,
            fontFamily: '"JetBrains Mono", monospace',
            flowchart: { curve: 'basis', htmlLabels: true },
            er: { useMaxWidth: true },
            sequence: { useMaxWidth: true },
            gantt: { useMaxWidth: true },
          } as any);
          isMermaidInit = true;
        } catch {
          // fallback
        }
      }
      return mermaid;
    });
  }
  return mermaidPromise;
};

// Robust Diagram Pre-Processor
function sanitizeMermaid(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim();

  // Strip wrapping markdown code fences if present
  clean = clean.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '');

  // Fix Gantt section colons: section Phase 0: Setup -> section Phase 0 - Setup
  clean = clean.replace(/section\s+([^:\n\r]+):/g, 'section $1 -');

  // Replace bare & with 'and' inside task or node labels
  clean = clean.replace(/(\b\w+)\s*&\s*(\w+\b)/g, '$1 and $2');

  // Strip invalid UK/PK combinations in erDiagram
  clean = clean.replace(/\b(UK|UNIQUE)\b/g, '');

  // Quote sequence diagram participant labels with parentheses
  clean = clean.replace(/participant\s+([A-Za-z0-9_]+)\s+as\s+([^"\n]+?\([^)\n]+?\))/g, 'participant $1 as "$2"');

  return clean.trim();
}

const CodeBlock: React.FC<{ language?: string; value: string }> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-5 rounded-xl overflow-hidden border border-white/10 bg-[#07090e] shadow-xl font-mono">
      <div className="px-4 py-2 bg-[#0c101a] border-b border-white/[0.08] flex items-center justify-between text-xs text-slate-400 select-none">
        <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">
          {language || 'CODE'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="hover:text-white flex items-center space-x-1.5 cursor-pointer transition px-2 py-1 rounded-md hover:bg-white/[0.06] text-[11px]"
          title="Copy code snippet"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs text-slate-200 leading-relaxed m-0 bg-transparent">
        <code>{value}</code>
      </pre>
    </div>
  );
};

const MermaidBlock: React.FC<{ code: string; isStreaming?: boolean }> = ({ code, isStreaming }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cleanFirstLine = code.trim().split('\n')[0].trim().toLowerCase();
  let diagramLabel = 'ARCHITECTURE BLUEPRINT';
  if (cleanFirstLine.startsWith('flowchart') || cleanFirstLine.startsWith('graph')) {
    diagramLabel = 'SYSTEM ARCHITECTURE FLOWCHART';
  } else if (cleanFirstLine.startsWith('erdiagram')) {
    diagramLabel = 'DATABASE SCHEMA & ER DIAGRAM';
  } else if (cleanFirstLine.startsWith('sequencediagram')) {
    diagramLabel = 'WORKFLOW & API SEQUENCE DIAGRAM';
  } else if (cleanFirstLine.startsWith('statediagram')) {
    diagramLabel = 'STATE TRANSITION MACHINE';
  } else if (cleanFirstLine.startsWith('gantt')) {
    diagramLabel = 'ENGINEERING ROADMAP GANTT';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let isCancelled = false;

    // Debounce rendering to avoid thrashing during streaming (350ms if streaming, 60ms if idle)
    const timer = setTimeout(async () => {
      if (!code.trim()) return;

      try {
        const mermaid = await getMermaid();
        const cleanId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const sanitized = sanitizeMermaid(code);

        const firstLine = sanitized.split('\n')[0].trim().toLowerCase();
        const validTypes = [
          'graph',
          'flowchart',
          'sequencediagram',
          'classdiagram',
          'statediagram',
          'erdiagram',
          'gantt',
          'pie',
          'gitgraph',
        ];

        if (!validTypes.some((t) => firstLine.startsWith(t))) {
          throw new Error('Diagram syntax preview');
        }

        const { svg: renderedSvg } = await mermaid.render(cleanId, sanitized);
        if (!isCancelled) {
          setSvg(renderedSvg);
          setRenderError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          document.querySelectorAll('[id^="dmermaid"]').forEach((el) => el.remove());
          setRenderError(err.message || 'Diagram syntax preview');
        }
      }
    }, isStreaming ? 350 : 60);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      document.querySelectorAll('[id^="dmermaid"]').forEach((el) => el.remove());
    };
  }, [code, isStreaming]);

  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-white/10 bg-[#080b13] shadow-2xl font-mono">
      {/* Diagram Top Bar */}
      <div className="px-4 py-2.5 bg-[#0d121f] border-b border-white/[0.08] flex items-center justify-between text-xs text-slate-400 select-none">
        <div className="flex items-center space-x-2.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          <span className="font-bold text-cyan-300 uppercase tracking-wider text-[10px]">
            [{diagramLabel}]
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="hover:text-white flex items-center space-x-1.5 cursor-pointer transition px-2 py-1 rounded-md hover:bg-white/[0.06] text-[11px]"
          title="Copy raw Mermaid code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Source'}</span>
        </button>
      </div>

      {renderError || !svg ? (
        <div className="p-4 text-xs">
          <pre className="text-slate-400 overflow-x-auto p-3 rounded-xl bg-black/60 border border-white/[0.08] m-0">
            {code}
          </pre>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="p-6 flex justify-center items-center overflow-x-auto max-w-full mermaid-svg-container"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  projectId,
  content,
  filename,
  isStreaming = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [showFrontmatter, setShowFrontmatter] = useState(false);
  const [showOutline, setShowOutline] = useState(false);

  // Extract frontmatter if present
  let frontmatter = '';
  let bodyContent = content;
  const match = content.match(/^---[\s\S]*?---\n*/);
  if (match) {
    frontmatter = match[0].trim();
    bodyContent = content.slice(match[0].length);
  }

  // Calculate lines and words
  const rawLines = useMemo(() => content.split('\n'), [content]);
  const lineCount = rawLines.length;
  const tokenEst = useMemo(() => Math.round(content.length / 4), [content]);

  // Extract headings for table of contents outline
  const headings = useMemo(() => {
    const lines = bodyContent.split('\n');
    const result: { level: number; text: string; id: string }[] = [];
    for (const line of lines) {
      const hMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const text = hMatch[2].trim().replace(/[#*`_]/g, '');
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        result.push({ level, text, id });
      }
    }
    return result;
  }, [bodyContent]);

  // Memoize markdown custom components map
  const markdownComponents = useMemo(
    () => ({
      h1({ children }: any) {
        const text = String(children);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return <h1 id={id}>{children}</h1>;
      },
      h2({ children }: any) {
        const text = String(children);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return <h2 id={id}>{children}</h2>;
      },
      h3({ children }: any) {
        const text = String(children);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return <h3 id={id}>{children}</h3>;
      },
      table({ children }: any) {
        return (
          <div className="my-4 overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-md">
            <table className="w-full text-left font-mono text-xs border-collapse">
              {children}
            </table>
          </div>
        );
      },
      th({ children }: any) {
        return (
          <th className="px-3 py-2 bg-[var(--bg-canvas-subtle)] border-b border-[var(--border-subtle)] text-[var(--accent-primary)] font-bold text-xs">
            {children}
          </th>
        );
      },
      td({ children }: any) {
        return (
          <td className="px-3 py-2 border-b border-[var(--border-subtle)]/40 text-[var(--text-secondary)] text-xs">
            {children}
          </td>
        );
      },
      blockquote({ children }: any) {
        return (
          <blockquote className="my-3 pl-3.5 pr-3 py-2.5 rounded-r-lg border-l-4 border-[var(--accent-primary)] bg-[var(--accent-glow)]/20 text-xs text-[var(--text-secondary)] italic">
            {children}
          </blockquote>
        );
      },
      pre({ children }: any) {
        return <>{children}</>;
      },
      code({ node, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const lang = match ? match[1] : '';
        const codeString = String(children).replace(/\n$/, '');

        if (lang === 'mermaid') {
          return <MermaidBlock code={codeString} isStreaming={isStreaming} />;
        }

        if (match || codeString.includes('\n')) {
          return <CodeBlock language={lang} value={codeString} />;
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }),
    [isStreaming]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c101a]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] bg-[#090d16]/90 shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="text-blue-400 font-bold text-xs select-none font-mono">
            FILE:
          </span>
          <span className="text-xs font-bold text-white font-mono truncate">
            {filename || 'document.md'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">[READONLY]</span>
          {isStreaming && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 shrink-0 animate-pulse font-mono">
              STREAMING
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          {/* Outline Toggle */}
          {headings.length > 2 && (
            <button
              type="button"
              onClick={() => setShowOutline(!showOutline)}
              className={`px-2.5 py-1 rounded-lg border text-xs transition cursor-pointer flex items-center space-x-1.5 ${
                showOutline
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 shadow-sm'
                  : 'bg-[#101626] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Toggle Outline / Table of Contents"
            >
              <ListTree className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px] font-mono">TOC</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#070a12] border border-white/10 p-0.5 rounded-xl text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('rendered')}
              className={`px-3 py-1 rounded-lg transition text-xs font-medium cursor-pointer ${
                viewMode === 'rendered'
                  ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded-lg transition text-xs font-medium cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Raw
            </button>
          </div>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 bg-[#101626] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-lg transition cursor-pointer text-xs flex items-center space-x-1.5 shadow-sm"
            title="Copy Document Content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download Segmented Group */}
          <div className="flex items-center bg-[#070a12] border border-white/10 rounded-xl p-0.5 space-x-1 shadow-inner font-mono">
            <span className="px-1 text-[10px] text-slate-500 hidden lg:inline select-none flex items-center gap-0.5">
              <Download className="w-3 h-3" />
            </span>
            <button
              type="button"
              onClick={() => downloadTextAsFile(content, filename || 'document.md', false)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-500/15 transition cursor-pointer"
              title="Download as Markdown file (.md)"
            >
              .md
            </button>
            <button
              type="button"
              onClick={() => downloadTextAsFile(content, filename || 'document.md', true)}
              className="px-2 py-0.5 rounded-lg text-[10px] text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Download as Plain Text (.txt)"
            >
              .txt
            </button>
            <button
              type="button"
              onClick={() => {
                const targetPdf = filename ? filename.replace(/\.(md|json)$/i, '.pdf') : 'document.pdf';
                if (projectId && filename) {
                  downloadBlob(`/api/projects/${projectId}/download/file/${filename}?format=pdf`, targetPdf);
                } else {
                  downloadTextAsFile(content, targetPdf, false);
                }
              }}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
              title="Download as PDF (.pdf)"
            >
              .pdf
            </button>
          </div>
        </div>
      </div>

      {/* Frontmatter collapsible banner */}
      {frontmatter && (
        <div className="border-b border-white/[0.06] bg-[#070a12]/60 px-4 py-2 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setShowFrontmatter(!showFrontmatter)}
            className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition font-mono text-[11px] cursor-pointer"
          >
            {showFrontmatter ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>[YAML Frontmatter]</span>
          </button>
          {showFrontmatter && (
            <pre className="mt-2 p-3 rounded-xl bg-black/60 text-blue-300 font-mono text-xs overflow-x-auto border border-white/10 shadow-inner">
              {frontmatter}
            </pre>
          )}
        </div>
      )}

      {/* Main Body Area: Split with Outline if open */}
      <div className="flex-1 flex overflow-hidden">
        {/* Outline Navigator Sidebar */}
        {showOutline && headings.length > 0 && (
          <div className="w-64 border-r border-white/[0.08] bg-[#070a12]/70 p-3.5 overflow-y-auto shrink-0 hidden md:block">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center space-x-1.5 font-mono">
              <ListTree className="w-3.5 h-3.5 text-blue-400" />
              <span>OUTLINE</span>
            </div>
            <nav className="space-y-1">
              {headings.map((h, i) => (
                <div
                  key={i}
                  className={`text-xs truncate transition cursor-pointer py-1 px-2 rounded-lg ${
                    h.level === 1
                      ? 'font-bold text-white hover:bg-white/[0.06]'
                      : h.level === 2
                      ? 'pl-4 text-slate-300 hover:text-white hover:bg-white/[0.04]'
                      : 'pl-6 text-[11px] text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => {
                    const el = document.getElementById(h.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {h.text}
                </div>
              ))}
            </nav>
          </div>
        )}

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7">
          {viewMode === 'raw' ? (
            <div className="flex space-x-3 text-xs leading-relaxed font-mono">
              {/* Line Gutter */}
              <div className="select-none text-slate-600 text-right pr-3 border-r border-white/10 shrink-0">
                {rawLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="flex-1 whitespace-pre-wrap text-slate-200">
                {content}
              </pre>
            </div>
          ) : (
            <div className="markdown-body max-w-4xl mx-auto">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {bodyContent}
              </Markdown>
            </div>
          )}
        </div>
      </div>

      {/* Statusline Footer */}
      <div className="px-4 py-2 border-t border-white/[0.08] bg-[#090d16]/90 text-[11px] text-slate-400 flex items-center justify-between shrink-0 font-mono select-none">
        <div className="flex items-center space-x-2.5">
          <span className="text-blue-400 font-bold">NORMAL</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">{filename || 'document.md'}</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          <span>{lineCount} lines</span>
          <span className="text-slate-600">•</span>
          <span>~{tokenEst} tokens</span>
          <span className="text-slate-600">•</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};

export default MarkdownViewer;
