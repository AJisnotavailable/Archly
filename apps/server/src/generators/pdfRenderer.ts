import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { config } from '../config';

interface StageDoc {
  stageNumber: number;
  filename: string;
  name: string;
  content: string;
}

interface ProjectMetadata {
  id: string;
  title: string;
  restatedIdea?: string;
  provider: string;
  model: string;
  createdAt: Date | string;
}

// ============================================================================
// Archly 2D Minimalist Dark Design Tokens
// ============================================================================

const BG_CANVAS = '#06080d';        // Deep Space Obsidian Canvas
const BG_SUBTLE = '#090c13';        // Header / Dark Surface
const BG_CARD = '#0e121b';          // Terminal Window / Card
const ACCENT_PRIMARY = '#3b82f6';   // Celestial Blue
const ACCENT_SECONDARY = '#38bdf8'; // Horizon Cyan
const ACCENT_GREEN = '#10b981';     // Emerald Active
const ACCENT_PEACH = '#f59e0b';     // Amber Status
const ACCENT_ROSE = '#f43f5e';      // Rose Accent
const TEXT_PRIMARY = '#f8fafc';     // Crisp White/Silver Text
const TEXT_SECONDARY = '#cbd5e1';   // Subtle Slate
const TEXT_MUTED = '#64748b';       // Muted Directive Text
const BORDER_SUBTLE = '#1b2333';    // Hairline 1px Border
const BORDER_STRONG = '#2563eb';    // Active Blue Hairline Border

// ============================================================================
// Text Sanitization (Sanitize Non-ASCII Unicode to Safe WinAnsi Equivalents)
// ============================================================================

function sanitizeText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\u2014\u2015]/g, ' -- ')   // em dash
    .replace(/[\u2012\u2013]/g, '-')      // en dash, figure dash
    .replace(/[\u2018\u2019]/g, "'")      // smart single quotes
    .replace(/[\u201C\u201D]/g, '"')      // smart double quotes
    .replace(/[\u2026]/g, '...')          // ellipsis
    .replace(/[\u2022\u25B8\u25B6\u25AA\u25CF]/g, '*') // bullet symbols
    .replace(/[\u2713\u2714]/g, '[X]')    // checkmark symbols
    .replace(/[^\x00-\x7F]/g, (char) => {
      // Keep basic Latin-1 supplement if valid, otherwise fallback
      const code = char.charCodeAt(0);
      return code <= 255 ? char : ' ';
    });
}

// Helper to ensure sufficient space before rendering a block
function ensurePageSpace(doc: PDFKit.PDFDocument, requiredHeight: number): void {
  if (doc.y + requiredHeight > doc.page.height - 55) {
    doc.addPage();
    doc.x = 50;
    doc.y = 50;
  }
}

// ============================================================================
// Inline Markdown Tokenizer & Renderer
// ============================================================================

interface FormattedToken {
  text: string;
  font: string;
  color: string;
  isCode?: boolean;
}

function parseInlineTokens(rawText: string): FormattedToken[] {
  const clean = sanitizeText(rawText);
  const tokens: FormattedToken[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(clean)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({
        text: clean.slice(lastIdx, match.index),
        font: 'Helvetica',
        color: TEXT_PRIMARY,
      });
    }

    const chunk = match[0];
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      tokens.push({
        text: chunk.slice(2, -2),
        font: 'Helvetica-Bold',
        color: TEXT_PRIMARY,
      });
    } else if (chunk.startsWith('*') && chunk.endsWith('*')) {
      tokens.push({
        text: chunk.slice(1, -1),
        font: 'Helvetica-Oblique',
        color: TEXT_SECONDARY,
      });
    } else if (chunk.startsWith('`') && chunk.endsWith('`')) {
      tokens.push({
        text: chunk.slice(1, -1),
        font: 'Courier',
        color: ACCENT_SECONDARY,
        isCode: true,
      });
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < clean.length) {
    tokens.push({
      text: clean.slice(lastIdx),
      font: 'Helvetica',
      color: TEXT_PRIMARY,
    });
  }

  return tokens.length > 0 ? tokens : [{ text: clean, font: 'Helvetica', color: TEXT_PRIMARY }];
}

function renderFormattedParagraph(
  doc: PDFKit.PDFDocument,
  rawText: string,
  startX: number,
  width: number,
  fontSize = 8.5,
  lineGap = 2.4
): void {
  const tokens = parseInlineTokens(rawText);
  doc.x = startX;
  doc.fontSize(fontSize);

  tokens.forEach((t, i) => {
    const isLast = i === tokens.length - 1;
    doc
      .font(t.font)
      .fillColor(t.color)
      .text(t.text, {
        continued: !isLast,
        lineGap,
        width,
      });
  });

  // Always reset doc.x to startX after text rendering finishes
  doc.x = startX;
}

// ============================================================================
// Markdown Table Parser
// ============================================================================

function parseTableRows(rawLines: string[]): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    if (/^\|(\s*[-:]+\s*\|)+$/.test(trimmed)) continue; // skip markdown divider |---|---|

    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((c) => sanitizeText(c.trim()).replace(/^[*`_]+|[*`_]+$/g, '').replace(/[*`_]/g, ''));
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0];
  const dataRows = rows.slice(1);
  return { headers, rows: dataRows };
}

// ============================================================================
// Intelligent Column Width Calculation
// ============================================================================

function calculateColumnWidths(headers: string[], rows: string[][], totalWidth = 495): number[] {
  const colCount = headers.length;
  if (colCount === 0) return [];
  if (colCount === 1) return [totalWidth];

  // 1. Measure longest single word per column to ensure zero word-breaking
  const minRequiredWordWidths = headers.map((h, c) => {
    let maxWordChars = 0;
    const words = [h, ...rows.map((r) => r[c] || '')].join(' ').split(/\s+/);
    for (const w of words) {
      if (w.length > maxWordChars) maxWordChars = w.length;
    }
    // ~5.5 points per character at 7.5pt Helvetica + 14pt cell padding
    return Math.max(50, Math.ceil(maxWordChars * 5.8) + 14);
  });

  // 2. Compute proportional content volume weights
  const colCharCounts = headers.map((h, c) => {
    let sumChars = h.length * 1.5;
    for (const row of rows) {
      sumChars += (row[c] || '').length;
    }
    const avgChars = sumChars / (rows.length + 1);
    return Math.max(avgChars, 15);
  });

  const sumVolume = colCharCounts.reduce((a, b) => a + b, 0);

  // 3. Initial proportional width distribution
  let widths = colCharCounts.map((v, c) => {
    const prop = Math.floor((v / sumVolume) * totalWidth);
    return Math.max(minRequiredWordWidths[c], prop);
  });

  // 4. Adjust to fit exactly totalWidth
  let allocated = widths.reduce((a, b) => a + b, 0);
  if (allocated > totalWidth) {
    // If sum of minimums exceeds totalWidth, scale proportionally
    widths = widths.map((w) => Math.max(45, Math.floor((w / allocated) * totalWidth)));
    allocated = widths.reduce((a, b) => a + b, 0);
  }

  const remainder = totalWidth - allocated;
  widths[widths.length - 1] += remainder;

  return widths;
}

// ============================================================================
// High-Fidelity Multi-Page Vector Table Engine
// ============================================================================

function drawVectorTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  tableWidth = 495
): void {
  if (headers.length === 0) return;

  const colCount = headers.length;
  const colWidths = calculateColumnWidths(headers, rows, tableWidth);
  const startX = 50;
  const headerHeight = 22;

  const drawHeaderRow = (isContinuation = false) => {
    const currentY = doc.y;
    doc.x = startX;
    doc.roundedRect(startX, currentY, tableWidth, headerHeight, 4).fillAndStroke(BG_SUBTLE, BORDER_SUBTLE);

    let currentX = startX;
    for (let c = 0; c < colCount; c++) {
      let text = (headers[c] || '').toUpperCase();
      if (isContinuation && c === 0) {
        text += ' (CONT.)';
      }
      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor(ACCENT_PRIMARY)
        .text(text, currentX + 6, currentY + 6, {
          width: colWidths[c] - 12,
          lineGap: 1,
          ellipsis: true,
        });
      currentX += colWidths[c];
    }
    doc.x = startX;
    doc.y = currentY + headerHeight;
  };

  ensurePageSpace(doc, headerHeight + 35);
  drawHeaderRow(false);

  // Draw Data Rows
  rows.forEach((row, rIdx) => {
    // Measure cell height accurately using target font size
    doc.fontSize(7.5).font('Helvetica');
    let maxCellHeight = 14;
    for (let c = 0; c < colCount; c++) {
      const cellText = row[c] || '-';
      const cellH = doc.heightOfString(cellText, {
        width: colWidths[c] - 12,
        lineGap: 1.5,
      });
      if (cellH > maxCellHeight) {
        maxCellHeight = cellH;
      }
    }

    const rowHeight = Math.max(20, maxCellHeight + 8);

    // If row overflows page, add page and repeat headers
    if (doc.y + rowHeight > doc.page.height - 55) {
      doc.addPage();
      doc.x = startX;
      doc.y = 50;
      drawHeaderRow(true);
    }

    const currentY = doc.y;
    doc.x = startX;
    const bg = rIdx % 2 === 0 ? BG_CARD : BG_CANVAS;
    doc.rect(startX, currentY, tableWidth, rowHeight).fillAndStroke(bg, BORDER_SUBTLE);

    let currentX = startX;
    for (let c = 0; c < colCount; c++) {
      const cellText = row[c] || '-';
      const isCodeLike = /^[a-zA-Z0-9_-]+\(\)$|^[A-Z_]{3,}$|^\/[a-z0-9/_-]+$/.test(cellText.trim());

      doc
        .fontSize(7.5)
        .font(isCodeLike ? 'Courier' : 'Helvetica')
        .fillColor(isCodeLike ? ACCENT_SECONDARY : TEXT_PRIMARY)
        .text(cellText, currentX + 6, currentY + 5, {
          width: colWidths[c] - 12,
          lineGap: 1.5,
          height: rowHeight - 6,
        });

      // Vertical cell divider
      if (c < colCount - 1) {
        doc
          .moveTo(currentX + colWidths[c], currentY)
          .lineTo(currentX + colWidths[c], currentY + rowHeight)
          .strokeColor(BORDER_SUBTLE)
          .stroke();
      }
      currentX += colWidths[c];
    }

    doc.x = startX;
    doc.y = currentY + rowHeight;
  });

  doc.moveDown(0.6);
  doc.x = startX;
}

// ============================================================================
// Diagram Fetcher & Disk Cache
// ============================================================================

async function fetchDiagramImage(mermaidCode: string, cacheDir: string): Promise<Buffer | null> {
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    let cleanCode = sanitizeText(mermaidCode.trim());
    cleanCode = cleanCode.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

    const hash = crypto.createHash('sha256').update(cleanCode).digest('hex').slice(0, 16);
    const cacheFile = path.join(cacheDir, `diagram-${hash}.jpg`);

    if (fs.existsSync(cacheFile)) {
      return fs.promises.readFile(cacheFile);
    }

    const payload = JSON.stringify({
      code: cleanCode,
      mermaid: {
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#0e121b',
          primaryColor: '#1e293b',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#3b82f6',
          lineColor: '#60a5fa',
          secondaryColor: '#1e1b4b',
          tertiaryColor: '#0f172a',
        },
      },
    });

    const encoded = Buffer.from(payload).toString('base64');
    const url = `https://mermaid.ink/img/${encoded}?bgColor=!0e121b`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 200) {
        await fs.promises.writeFile(cacheFile, buffer);
        return buffer;
      }
    }
  } catch (err: any) {
    console.warn('[pdfRenderer] Could not fetch diagram render, will fallback gracefully:', err?.message);
  }
  return null;
}

// ============================================================================
// HUD Diagram Card
// ============================================================================

function drawDiagramBlueprintCard(
  doc: PDFKit.PDFDocument,
  rawCode: string,
  imageBuffer: Buffer | null,
  tableWidth = 495
): void {
  const cleanCode = sanitizeText(rawCode.trim());
  const firstLine = cleanCode.split('\n')[0].trim().toLowerCase();

  let diagramTypeTitle = 'ARCHITECTURE BLUEPRINT';
  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) {
    diagramTypeTitle = 'SYSTEM ARCHITECTURE FLOWCHART';
  } else if (firstLine.startsWith('erdiagram')) {
    diagramTypeTitle = 'DATABASE SCHEMA & ER DIAGRAM';
  } else if (firstLine.startsWith('sequencediagram')) {
    diagramTypeTitle = 'WORKFLOW & API SEQUENCE DIAGRAM';
  } else if (firstLine.startsWith('statediagram')) {
    diagramTypeTitle = 'STATE TRANSITION MACHINE';
  } else if (firstLine.startsWith('gantt')) {
    diagramTypeTitle = 'ENGINEERING ROADMAP GANTT';
  }

  const startX = 50;

  // Case A: High-Resolution Rendered Diagram Graphic Available
  if (imageBuffer && imageBuffer.length > 200) {
    const cardHeight = 290;
    ensurePageSpace(doc, cardHeight + 25);

    const cardY = doc.y;
    doc.x = startX;

    doc
      .roundedRect(startX, cardY, tableWidth, cardHeight, 6)
      .fillAndStroke(BG_CARD, BORDER_STRONG);

    // Top Chrome Bar
    doc.roundedRect(startX, cardY, tableWidth, 22, 6).fill(BG_SUBTLE);
    doc.rect(startX, cardY + 16, tableWidth, 6).fill(BG_SUBTLE);

    // Active Indicator Circle
    doc.circle(startX + 12, cardY + 11, 3.5).fill(ACCENT_PRIMARY);

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(ACCENT_PRIMARY)
      .text(`[${diagramTypeTitle}]`, startX + 22, cardY + 6, { characterSpacing: 0.5 });

    doc
      .fontSize(7.5)
      .font('Courier')
      .fillColor(ACCENT_GREEN)
      .text('[LIVE VECTOR RENDER]', startX + tableWidth - 120, cardY + 6, {
        align: 'right',
        width: 110,
      });

    const imgPadding = 8;
    const imgX = startX + imgPadding;
    const imgY = cardY + 26;
    const imgWidth = tableWidth - imgPadding * 2;
    const imgHeight = cardHeight - 34;

    try {
      doc.image(imageBuffer, imgX, imgY, {
        fit: [imgWidth, imgHeight],
        align: 'center',
        valign: 'center',
      });
    } catch (imgErr) {
      console.warn('[pdfRenderer] Failed to embed image, fallback to code card:', imgErr);
    }

    doc.x = startX;
    doc.y = cardY + cardHeight + 12;
    return;
  }

  // Case B: Syntax Blueprint Fallback
  const lines = cleanCode.split('\n');
  const codeSnippet = lines.slice(0, 30).join('\n');
  const snippetLines = codeSnippet.split('\n').length;
  const estimatedCodeHeight = snippetLines * 11 + 22;
  const totalCardHeight = Math.min(24 + estimatedCodeHeight, 340);

  ensurePageSpace(doc, totalCardHeight + 20);

  const cardY = doc.y;
  doc.x = startX;

  doc.roundedRect(startX, cardY, tableWidth, totalCardHeight, 6).fillAndStroke(BG_CARD, BORDER_STRONG);
  doc.roundedRect(startX, cardY, tableWidth, 22, 6).fill(BG_SUBTLE);
  doc.rect(startX, cardY + 16, tableWidth, 6).fill(BG_SUBTLE);
  doc.circle(startX + 12, cardY + 11, 3.5).fill(ACCENT_PRIMARY);

  doc
    .fontSize(8)
    .font('Helvetica-Bold')
    .fillColor(ACCENT_PRIMARY)
    .text(`[${diagramTypeTitle}]`, startX + 22, cardY + 6, { characterSpacing: 0.5 });

  doc
    .fontSize(7.5)
    .font('Courier')
    .fillColor(TEXT_MUTED)
    .text('$ cp source', startX + tableWidth - 75, cardY + 6, { align: 'right', width: 65 });

  const innerY = cardY + 28;
  const codeBoxHeight = totalCardHeight - 34;
  doc.roundedRect(startX + 8, innerY, tableWidth - 16, codeBoxHeight, 4).fillAndStroke(BG_SUBTLE, BORDER_SUBTLE);

  doc
    .fontSize(7.5)
    .font('Courier')
    .fillColor(ACCENT_SECONDARY)
    .text(codeSnippet, startX + 14, innerY + 6, {
      width: tableWidth - 28,
      lineGap: 2.2,
      height: codeBoxHeight - 12,
      ellipsis: true,
    });

  doc.x = startX;
  doc.y = cardY + totalCardHeight + 10;
}

// ============================================================================
// HUD Code Block
// ============================================================================

function drawCodeBlock(
  doc: PDFKit.PDFDocument,
  rawCode: string,
  lang = 'code',
  tableWidth = 495
): void {
  const cleanCode = sanitizeText(rawCode.trim());
  const linesCount = cleanCode.split('\n').length;
  const estimatedHeight = Math.min(linesCount * 11.5 + 24, 280);

  ensurePageSpace(doc, estimatedHeight + 15);

  const startX = 50;
  const cardY = doc.y;
  doc.x = startX;

  doc.roundedRect(startX, cardY, tableWidth, estimatedHeight, 4).fillAndStroke(BG_SUBTLE, BORDER_SUBTLE);
  doc.roundedRect(startX, cardY, tableWidth, 20, 4).fill(BG_CARD);
  doc.rect(startX, cardY + 14, tableWidth, 6).fill(BG_CARD);

  doc
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .fillColor(ACCENT_PRIMARY)
    .text(`[${(lang || 'CODE').toUpperCase()}]`, startX + 10, cardY + 5);

  doc
    .fontSize(7)
    .font('Courier')
    .fillColor(TEXT_MUTED)
    .text('$ cp', startX + tableWidth - 50, cardY + 6, { align: 'right', width: 40 });

  doc
    .moveTo(startX, cardY + 20)
    .lineTo(startX + tableWidth, cardY + 20)
    .strokeColor(BORDER_SUBTLE)
    .stroke();

  doc
    .fontSize(7.5)
    .font('Courier')
    .fillColor(ACCENT_GREEN)
    .text(cleanCode, startX + 12, cardY + 25, {
      width: tableWidth - 24,
      lineGap: 2.4,
      height: estimatedHeight - 30,
      ellipsis: true,
    });

  doc.x = startX;
  doc.y = cardY + estimatedHeight + 8;
}

// ============================================================================
// Core PDF Compilation Engine
// ============================================================================

export async function generateProjectPDF(
  project: ProjectMetadata,
  docs: StageDoc[],
  customOutputPath?: string
): Promise<string> {
  const projectDir = path.join(config.storageDir, 'projects', project.id);
  const diagramCacheDir = path.join(projectDir, 'diagram_cache');
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const pdfPath = customOutputPath || path.join(projectDir, `archly-architecture-${project.id}.pdf`);
  const legacyPdfPath = path.join(projectDir, `project-blueprint-${project.id}.pdf`);
  const htmlPath = path.join(projectDir, `archly-architecture-${project.id}.html`);

  // 1. Generate High-Fidelity Standalone HTML Version
  await generatePrintableHTML(project, docs, htmlPath);

  // 2. Pre-fetch and cache all Mermaid diagram renders concurrently
  const diagramImageMap = new Map<string, Buffer>();
  const fetchPromises: Promise<void>[] = [];

  for (const docItem of docs) {
    const cleanBody = docItem.content.replace(/^---[\s\S]*?---\n*/, '').trim();
    const lines = cleanBody.split('\n');
    let j = 0;
    while (j < lines.length) {
      if (lines[j].trim().startsWith('```')) {
        const langMatch = lines[j].trim().match(/^```(\w+)?/);
        const lang = langMatch ? (langMatch[1] || '').toLowerCase() : '';
        const codeLines: string[] = [];
        j++;
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          codeLines.push(lines[j]);
          j++;
        }
        j++;

        const codeContent = codeLines.join('\n');
        if (
          lang === 'mermaid' ||
          codeContent.startsWith('flowchart') ||
          codeContent.startsWith('graph') ||
          codeContent.startsWith('erDiagram') ||
          codeContent.startsWith('sequenceDiagram') ||
          codeContent.startsWith('stateDiagram') ||
          codeContent.startsWith('gantt')
        ) {
          const hash = crypto.createHash('sha256').update(codeContent.trim()).digest('hex').slice(0, 16);
          fetchPromises.push(
            (async () => {
              const imgBuf = await fetchDiagramImage(codeContent, diagramCacheDir);
              if (imgBuf) {
                diagramImageMap.set(hash, imgBuf);
              }
            })()
          );
        }
        continue;
      }
      j++;
    }
  }

  await Promise.allSettled(fetchPromises);

  // 3. Compile Vector PDF with Embedded Diagrams & Enhanced Tables
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 55, left: 50, right: 50 },
      bufferPages: true,
    });

    const writeStream = fs.createWriteStream(pdfPath);
    writeStream.on('finish', () => {
      try {
        fs.copyFileSync(pdfPath, legacyPdfPath);
      } catch {}
      resolve(pdfPath);
    });
    writeStream.on('error', reject);
    doc.pipe(writeStream);

    const startX = 50;
    const tableWidth = 495;

    // Auto-fill dark canvas on initial page
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG_CANVAS);
    doc.x = startX;
    doc.y = 50;

    // Auto-fill dark canvas on every page added dynamically or automatically
    doc.on('pageAdded', () => {
      doc.save();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG_CANVAS);
      doc.restore();
      doc.x = startX;
      doc.y = 50;
    });

    // ========================================================================
    // COVER PAGE — 2D Architectural Specification Chrome
    // ========================================================================

    doc.roundedRect(startX, 42, tableWidth, 22, 4).fillAndStroke(BG_SUBTLE, BORDER_SUBTLE);
    doc.roundedRect(startX + 10, 48, 8, 10, 2).fill(ACCENT_PRIMARY);

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(TEXT_PRIMARY)
      .text('ARCHLY SYSTEM ARCHITECTURE SPECIFICATION', startX + 26, 48);

    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor(ACCENT_SECONDARY)
      .text('ENTERPRISE BLUEPRINT COMPILER', startX + tableWidth - 170, 48, { width: 160, align: 'right' });

    doc.x = startX;
    doc.y = 80;

    doc
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor(ACCENT_PRIMARY)
      .text('Archly  //  IDEAS TO SYSTEMS  v1.0.0', startX, doc.y, { characterSpacing: 1.0 });

    doc.moveDown(0.6);

    doc
      .fontSize(22)
      .fillColor(TEXT_PRIMARY)
      .font('Helvetica-Bold')
      .text(sanitizeText(project.title), startX, doc.y, { lineGap: 4, width: tableWidth });

    doc.moveDown(0.3);
    doc.rect(startX, doc.y, tableWidth, 2).fill(ACCENT_PRIMARY);
    doc.moveDown(0.8);

    if (project.restatedIdea) {
      doc
        .fontSize(9.5)
        .fillColor(TEXT_SECONDARY)
        .font('Helvetica')
        .text(sanitizeText(project.restatedIdea), startX, doc.y, { lineGap: 3.5, width: tableWidth });
    }

    doc.moveDown(1.5);

    // Synthesis Telemetry Box
    const telemetryY = doc.y;
    doc.roundedRect(startX, telemetryY, tableWidth, 115, 4).fillAndStroke(BG_CARD, BORDER_SUBTLE);
    doc.roundedRect(startX, telemetryY, tableWidth, 22, 4).fill(BG_SUBTLE);
    doc.rect(startX, telemetryY + 16, tableWidth, 6).fill(BG_SUBTLE);

    doc
      .fontSize(8)
      .fillColor(ACCENT_PRIMARY)
      .font('Helvetica-Bold')
      .text('[SYNTHESIS METADATA & COMPILATION TELEMETRY]', startX + 12, telemetryY + 7);

    const metaLineY = telemetryY + 30;
    doc.font('Helvetica').fillColor(TEXT_PRIMARY).fontSize(8.5);
    doc.text(`AI Inference Engine:   ${project.provider.toUpperCase()} (${project.model})`, startX + 16, metaLineY);
    doc.text(`Document Volume:       ${docs.length} Technical Specifications (Full Architectural Package)`, startX + 16, metaLineY + 18);
    doc.text(`Compilation Timestamp: ${new Date(project.createdAt).toUTCString()}`, startX + 16, metaLineY + 36);
    doc.text(`Design Standard:       Archly Enterprise Technical Specification Standard`, startX + 16, metaLineY + 54);

    // ========================================================================
    // TABLE OF CONTENTS — Document Index
    // ========================================================================

    doc.addPage();
    doc.x = startX;
    doc.y = 50;

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(ACCENT_SECONDARY)
      .text('[DOCUMENT REGISTRY & INDEX]', startX, doc.y);
    doc.moveDown(0.2);

    doc.fontSize(16).fillColor(TEXT_PRIMARY).font('Helvetica-Bold').text('Table of Contents', startX, doc.y);
    doc.moveDown(0.3);
    doc.rect(startX, doc.y, tableWidth, 2).fill(ACCENT_PRIMARY);
    doc.moveDown(0.8);

    docs.forEach((d, idx) => {
      const rowY = doc.y;
      ensurePageSpace(doc, 22);

      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor(ACCENT_SECONDARY)
        .text(`[${String(idx + 1).padStart(2, '0')}]`, startX, rowY, { continued: true });

      doc
        .font('Helvetica-Bold')
        .fillColor(TEXT_PRIMARY)
        .text(`  ${sanitizeText(d.name)} `, { continued: true });

      doc
        .font('Courier')
        .fillColor(TEXT_MUTED)
        .text(`- ${sanitizeText(d.filename)}`);

      doc.x = startX;
      doc.moveDown(0.5);
    });

    // ========================================================================
    // CONTENT SECTIONS
    // ========================================================================

    for (const docItem of docs) {
      doc.addPage();
      doc.x = startX;
      doc.y = 50;

      const secHeaderY = doc.y;
      doc.roundedRect(startX, secHeaderY, tableWidth, 22, 4).fillAndStroke(BG_SUBTLE, BORDER_SUBTLE);

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(ACCENT_PRIMARY)
        .text(`FILE: ${sanitizeText(docItem.filename)} [RO] [UTF-8]`, startX + 10, secHeaderY + 6);

      doc
        .fontSize(7.5)
        .font('Courier')
        .fillColor(ACCENT_SECONDARY)
        .text(`[STAGE ${String(docItem.stageNumber).padStart(2, '0')}]`, startX + tableWidth - 85, secHeaderY + 6, {
          align: 'right',
          width: 75,
        });

      // Reset cursor cleanly below header
      doc.x = startX;
      doc.y = secHeaderY + 32;

      // Clean markdown content
      const cleanBody = docItem.content.replace(/^---[\s\S]*?---\n*/, '').trim();
      const lines = cleanBody.split('\n');

      // Check if first non-empty line is an H1 title
      let firstH1Consumed = false;
      const firstNonEmpty = lines.find((l) => l.trim().length > 0) || '';
      if (firstNonEmpty.trim().startsWith('# ')) {
        firstH1Consumed = true;
      } else {
        // Render document name as primary section title
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor(TEXT_PRIMARY)
          .text(sanitizeText(docItem.name), startX, doc.y, { width: tableWidth });

        doc.moveDown(0.2);
        doc.rect(startX, doc.y, tableWidth, 1.5).fill(BORDER_SUBTLE);
        doc.moveDown(0.6);
        doc.x = startX;
      }

      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // 1. Code Block & Mermaid Diagram detection
        if (trimmed.startsWith('```')) {
          const langMatch = trimmed.match(/^```(\w+)?/);
          const lang = langMatch ? (langMatch[1] || '').toLowerCase() : '';

          const codeLines: string[] = [];
          i++;
          while (i < lines.length && !lines[i].trim().startsWith('```')) {
            codeLines.push(lines[i]);
            i++;
          }
          i++; // skip closing ```

          const codeContent = codeLines.join('\n');
          if (
            lang === 'mermaid' ||
            codeContent.startsWith('flowchart') ||
            codeContent.startsWith('graph') ||
            codeContent.startsWith('erDiagram') ||
            codeContent.startsWith('sequenceDiagram') ||
            codeContent.startsWith('stateDiagram') ||
            codeContent.startsWith('gantt')
          ) {
            const hash = crypto.createHash('sha256').update(codeContent.trim()).digest('hex').slice(0, 16);
            const imgBuf = diagramImageMap.get(hash) || null;
            drawDiagramBlueprintCard(doc, codeContent, imgBuf, tableWidth);
          } else {
            drawCodeBlock(doc, codeContent, lang, tableWidth);
          }
          doc.x = startX;
          continue;
        }

        // 2. Table Block detection
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          const tableLines: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            tableLines.push(lines[i].trim());
            i++;
          }

          const { headers, rows } = parseTableRows(tableLines);
          if (headers.length > 0) {
            drawVectorTable(doc, headers, rows, tableWidth);
          }
          doc.x = startX;
          continue;
        }

        // 3. Blank Lines
        if (!trimmed) {
          doc.moveDown(0.35);
          doc.x = startX;
          i++;
          continue;
        }

        // 4. Horizontal Rules
        if (/^([-*_]){3,}$/.test(trimmed)) {
          ensurePageSpace(doc, 10);
          doc.rect(startX, doc.y, tableWidth, 1).fill(BORDER_SUBTLE);
          doc.moveDown(0.4);
          doc.x = startX;
          i++;
          continue;
        }

        // 5. Headings
        if (trimmed.startsWith('# ')) {
          ensurePageSpace(doc, 35);
          const headingText = sanitizeText(trimmed.replace(/^#\s*/, ''));
          doc
            .fontSize(15)
            .fillColor(TEXT_PRIMARY)
            .font('Helvetica-Bold')
            .text(headingText, startX, doc.y, { width: tableWidth });
          doc.moveDown(0.2);
          doc.rect(startX, doc.y, tableWidth, 1.5).fill(BORDER_SUBTLE);
          doc.moveDown(0.4);
          doc.x = startX;
        } else if (trimmed.startsWith('## ')) {
          ensurePageSpace(doc, 30);
          const headingText = sanitizeText(trimmed.replace(/^##\s*/, ''));
          doc
            .fontSize(12)
            .fillColor(ACCENT_PRIMARY)
            .font('Helvetica-Bold')
            .text(headingText, startX, doc.y, { width: tableWidth });
          doc.moveDown(0.3);
          doc.x = startX;
        } else if (trimmed.startsWith('### ')) {
          ensurePageSpace(doc, 25);
          const headingText = sanitizeText(trimmed.replace(/^###\s*/, ''));
          doc
            .fontSize(10)
            .fillColor(ACCENT_SECONDARY)
            .font('Helvetica-Bold')
            .text(headingText, startX, doc.y, { width: tableWidth });
          doc.moveDown(0.25);
          doc.x = startX;
        } else if (trimmed.startsWith('#### ')) {
          ensurePageSpace(doc, 20);
          const headingText = sanitizeText(trimmed.replace(/^####\s*/, ''));
          doc
            .fontSize(9)
            .fillColor(TEXT_SECONDARY)
            .font('Helvetica-Bold')
            .text(headingText, startX, doc.y, { width: tableWidth });
          doc.moveDown(0.2);
          doc.x = startX;
        }
        // 6. Checklist items: - [ ] or - [x]
        else if (/^[-*]\s+\[([ xX])\]\s+/.test(trimmed)) {
          const isChecked = /\[[xX]\]/.test(trimmed);
          const checkText = trimmed.replace(/^[-*]\s+\[[ xX]\]\s+/, '');
          ensurePageSpace(doc, 14);

          const checkY = doc.y;
          // Clean vector checkbox indicator
          if (isChecked) {
            doc.roundedRect(startX + 2, checkY + 1.5, 9, 9, 2).fillAndStroke(ACCENT_GREEN, ACCENT_GREEN);
            doc.fontSize(7).font('Helvetica-Bold').fillColor(BG_CANVAS).text('X', startX + 4.5, checkY + 2.5);
          } else {
            doc.roundedRect(startX + 2, checkY + 1.5, 9, 9, 2).strokeColor(TEXT_MUTED).stroke();
          }

          doc.y = checkY;
          renderFormattedParagraph(doc, checkText, startX + 16, tableWidth - 16, 8.5);
          doc.x = startX;
          doc.moveDown(0.2);
        }
        // 7. Bullets (- * +)
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
          const bulletText = trimmed.replace(/^[-*+]\s*/, '');
          const isIndented = line.startsWith('  ') || line.startsWith('\t');
          const bulletX = isIndented ? startX + 14 : startX;
          const bulletWidth = isIndented ? tableWidth - 14 : tableWidth;

          ensurePageSpace(doc, 14);
          const dotY = doc.y;

          // Crisp vector dot bullet (zero font corruption)
          doc.circle(bulletX + 4, dotY + 5.5, 2).fill(ACCENT_PRIMARY);

          doc.y = dotY;
          renderFormattedParagraph(doc, bulletText, bulletX + 12, bulletWidth - 12, 8.5);
          doc.x = startX;
          doc.moveDown(0.2);
        }
        // 8. Numbered Lists (1. 2. etc.)
        else if (/^\d+\.\s+/.test(trimmed)) {
          const numMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
          const numPrefix = numMatch ? numMatch[1] : '1.';
          const numText = numMatch ? numMatch[2] : trimmed;

          ensurePageSpace(doc, 14);
          const numY = doc.y;

          doc
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .fillColor(ACCENT_SECONDARY)
            .text(`${numPrefix}`, startX, numY, { width: 18 });

          doc.y = numY;
          renderFormattedParagraph(doc, numText, startX + 18, tableWidth - 18, 8.5);
          doc.x = startX;
          doc.moveDown(0.2);
        }
        // 9. Blockquotes (> )
        else if (trimmed.startsWith('> ')) {
          const quoteText = sanitizeText(trimmed.replace(/^>\s*/, ''));
          doc.fontSize(8).font('Helvetica-Oblique');
          const estimatedH = doc.heightOfString(quoteText, { width: tableWidth - 24, lineGap: 2 }) + 12;
          ensurePageSpace(doc, estimatedH + 6);

          const quoteY = doc.y;
          doc.roundedRect(startX, quoteY, tableWidth, estimatedH, 3).fill(BG_CARD);
          doc.rect(startX, quoteY, 3, estimatedH).fill(ACCENT_PRIMARY);

          doc
            .fontSize(8)
            .fillColor(TEXT_SECONDARY)
            .font('Helvetica-Oblique')
            .text(quoteText, startX + 12, quoteY + 6, { width: tableWidth - 24, lineGap: 2 });

          doc.x = startX;
          doc.y = quoteY + estimatedH + 6;
        }
        // 10. Standard Paragraphs
        else {
          doc.fontSize(8.5).font('Helvetica');
          const pHeight = doc.heightOfString(sanitizeText(trimmed), { width: tableWidth, lineGap: 2.5 });
          ensurePageSpace(doc, Math.min(pHeight + 4, 80));
          renderFormattedParagraph(doc, trimmed, startX, tableWidth, 8.5, 2.5);
          doc.x = startX;
          doc.moveDown(0.3);
        }

        i++;
      }
    }

    // ========================================================================
    // HUD VIM STATUSLINE FOOTER ON ALL PAGES (WITHOUT GHOST PAGE OVERFLOW)
    // ========================================================================

    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    // Temporarily zero bottom margin so writing at footerY does not trigger pageAdded!
    doc.page.margins.bottom = 0;

    for (let p = 1; p < totalPages; p++) {
      doc.switchToPage(p);
      doc.page.margins.bottom = 0;
      const footerY = doc.page.height - 30;

      doc
        .moveTo(startX, footerY - 4)
        .lineTo(startX + tableWidth, footerY - 4)
        .strokeColor(BORDER_SUBTLE)
        .stroke();

      doc
        .fontSize(7.5)
        .fillColor(ACCENT_PRIMARY)
        .font('Courier')
        .text('-- NORMAL -- archly :~/workspace', startX, footerY, {
          lineBreak: false,
        });

      doc
        .fontSize(7.5)
        .font('Courier')
        .fillColor(TEXT_MUTED)
        .text(` | Page ${p + 1} of ${totalPages} [100%]`, startX, footerY, {
          align: 'right',
          width: tableWidth,
          lineBreak: false,
        });
    }

    doc.end();
  });
}

export async function generateSingleDocumentPDF(
  project: ProjectMetadata,
  docItem: StageDoc,
  outputPath: string
): Promise<string> {
  return generateProjectPDF(project, [docItem], outputPath);
}

// ============================================================================
// Printable Standalone HTML Report
// ============================================================================

async function generatePrintableHTML(
  project: ProjectMetadata,
  docs: StageDoc[],
  outputPath: string
): Promise<void> {
  const sectionsHtml = docs
    .map(
      (d) => `
    <article class="stage-section page-break">
      <header class="section-header">
        <span class="section-tag">FILE: ${escapeHtml(d.filename)} [RO] [STAGE ${String(d.stageNumber).padStart(2, '0')}]</span>
        <h2>${escapeHtml(d.name)}</h2>
      </header>
      <div class="markdown-content" data-content="${escapeHtml(d.content.replace(/^---[\s\S]*?---\n*/, '').trim())}">
        <!-- Dynamic expansion via marked & mermaid -->
      </div>
    </article>
  `
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)} — Archly Technical Specification</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    :root {
      --bg-canvas: #06080d;
      --bg-subtle: #090c13;
      --bg-card: #0e121b;
      --accent-primary: #3b82f6;
      --accent-secondary: #38bdf8;
      --accent-green: #10b981;
      --accent-peach: #f59e0b;
      --accent-rose: #f43f5e;
      --text-primary: #f8fafc;
      --text-secondary: #cbd5e1;
      --text-muted: #64748b;
      --border-subtle: #1b2333;
      --border-strong: #2563eb;
    }

    * { box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', monospace;
      line-height: 1.6;
      color: var(--text-primary);
      background: var(--bg-canvas);
      margin: 0;
      padding: 2rem 1.5rem;
    }

    .report-container {
      max-width: 960px;
      margin: 0 auto;
      background: var(--bg-canvas);
      padding: 2.5rem;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .terminal-titlebar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 2rem;
    }

    .traffic-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    .dot-red { background: var(--accent-rose); }
    .dot-yellow { background: var(--accent-peach); }
    .dot-green { background: var(--accent-green); }

    .cover-banner {
      border-bottom: 2px solid var(--border-subtle);
      padding-bottom: 2rem;
      margin-bottom: 3rem;
    }

    .cover-tag {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--accent-primary);
      margin-bottom: 0.5rem;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2.2rem;
      font-weight: 800;
      line-height: 1.25;
      margin: 0 0 1rem 0;
      color: var(--text-primary);
    }

    .idea-lead {
      font-size: 1rem;
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
    }

    .meta-item strong {
      display: block;
      color: var(--accent-primary);
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .stage-section {
      margin-bottom: 3.5rem;
      padding-top: 1.75rem;
      border-top: 1px solid var(--border-subtle);
    }

    .section-header {
      margin-bottom: 1.5rem;
      background: var(--bg-subtle);
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle);
    }

    .section-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--accent-primary);
      text-transform: uppercase;
    }

    .section-header h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.6rem;
      font-weight: 700;
      margin: 0.35rem 0 0 0;
      color: var(--text-primary);
    }

    .markdown-content h1, .markdown-content h2, .markdown-content h3 {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
    }

    .markdown-content h2 { color: var(--accent-primary); }
    .markdown-content h3 { color: var(--accent-secondary); }

    .markdown-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.825rem;
      background: var(--bg-card);
      border-radius: 6px;
      overflow: hidden;
    }

    .markdown-content th {
      background: var(--bg-subtle);
      color: var(--accent-primary);
      text-align: left;
      padding: 0.65rem 1rem;
      border: 1px solid var(--border-subtle);
      font-weight: bold;
    }

    .markdown-content td {
      padding: 0.6rem 1rem;
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .markdown-content tr:nth-child(even) {
      background: var(--bg-canvas);
    }

    .markdown-content pre {
      background: var(--bg-subtle);
      color: var(--accent-green);
      padding: 1.25rem;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.825rem;
      line-height: 1.5;
      border: 1px solid var(--border-subtle);
    }

    .markdown-content code:not(pre code) {
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent-secondary);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85em;
    }

    .mermaid-diagram-container {
      margin: 2rem 0;
      padding: 1.5rem;
      background: var(--bg-subtle);
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      display: flex;
      justify-content: center;
      overflow-x: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { background: var(--bg-canvas) !important; color: var(--text-primary) !important; padding: 0; }
      .report-container { border: none; box-shadow: none; padding: 0; max-width: 100%; background: var(--bg-canvas) !important; }
      .page-break { page-break-after: always; break-after: page; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="terminal-titlebar no-print">
      <div style="display: flex; gap: 5px;">
        <span class="traffic-dot dot-red"></span>
        <span class="traffic-dot dot-yellow"></span>
        <span class="traffic-dot dot-green"></span>
      </div>
      <span style="margin-left: 6px;">dev@archly:~/workspace (archly-blueprint 80x24)</span>
      <div style="margin-left: auto;">
        <button onclick="window.print()" style="padding: 0.35rem 0.75rem; background: var(--accent-primary); color: #ffffff; border: none; border-radius: 4px; font-weight: bold; font-family: monospace; cursor: pointer;">
          $ print/pdf
        </button>
      </div>
    </div>

    <header class="cover-banner">
      <span class="cover-tag">Archly :~/workspace  v1.0.0</span>
      <h1>${escapeHtml(project.title)}</h1>
      <p class="idea-lead">${escapeHtml(project.restatedIdea || '')}</p>
      <div class="meta-grid">
        <div class="meta-item">
          <strong>Inference Engine</strong>
          ${escapeHtml(project.provider.toUpperCase())} (${escapeHtml(project.model)})
        </div>
        <div class="meta-item">
          <strong>Document Volume</strong>
          ${docs.length} Technical Specifications
        </div>
        <div class="meta-item">
          <strong>Compilation Timestamp</strong>
          ${new Date(project.createdAt).toUTCString()}
        </div>
        <div class="meta-item">
          <strong>Design Standard</strong>
          Archly Enterprise Specification Standard
        </div>
      </div>
    </header>

    ${sectionsHtml}
  </div>

  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'dark', fontFamily: '"JetBrains Mono", monospace' });

    document.querySelectorAll('.markdown-content').forEach(async (el) => {
      const raw = el.getAttribute('data-content');
      if (!raw) return;

      const renderer = new marked.Renderer();
      const origCode = renderer.code.bind(renderer);
      renderer.code = function({ text, lang }) {
        if (lang === 'mermaid') {
          return '<div class="mermaid-diagram-container"><div class="mermaid">' + text + '</div></div>';
        }
        return origCode({ text, lang });
      };

      el.innerHTML = marked.parse(raw, { renderer });
    });

    setTimeout(() => {
      mermaid.run();
    }, 250);
  </script>
</body>
</html>`;

  await fs.promises.writeFile(outputPath, html, 'utf-8');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
