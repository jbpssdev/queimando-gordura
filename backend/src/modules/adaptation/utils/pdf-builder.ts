export type PdfFont = 'F1' | 'F2' | 'F3'; // F1: Helvetica, F2: Helvetica-Bold, F3: Helvetica-Oblique

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export const Colors = {
  black: { r: 0.1, g: 0.1, b: 0.1 },
  darkGray: { r: 0.3, g: 0.3, b: 0.3 },
  gray: { r: 0.5, g: 0.5, b: 0.5 },
  lightGray: { r: 0.88, g: 0.88, b: 0.9 },
  veryLightGray: { r: 0.96, g: 0.96, b: 0.97 },
  white: { r: 1, g: 1, b: 1 },
  primary: { r: 0.1, g: 0.35, b: 0.65 },
  primaryLight: { r: 0.92, g: 0.95, b: 0.98 },
  warning: { r: 0.7, g: 0.35, b: 0.05 },
  warningLight: { r: 0.99, g: 0.96, b: 0.9 },
  danger: { r: 0.75, g: 0.15, b: 0.15 },
  dangerLight: { r: 0.99, g: 0.93, b: 0.93 },
  success: { r: 0.15, g: 0.55, b: 0.25 },
  successLight: { r: 0.93, g: 0.98, b: 0.94 },
};

export class PdfBuilder {
  readonly pageWidth = 595.28;
  readonly pageHeight = 841.89;
  readonly margin = 40;
  readonly bottomMargin = 48;
  readonly contentWidth = 595.28 - 80; // 515.28

  private readonly pages: string[] = [];
  private currentOps: string[] = [];
  private currentY: number;

  constructor() {
    this.currentY = this.pageHeight - this.margin;
    this.startNewPage();
  }

  get y(): number {
    return this.currentY;
  }

  set y(val: number) {
    this.currentY = val;
  }

  startNewPage(): void {
    if (this.currentOps.length > 0) {
      this.pages.push(this.currentOps.join('\n'));
      this.currentOps = [];
    }
    this.currentY = this.pageHeight - this.margin;
  }

  ensureSpace(ptsNeeded: number): void {
    if (this.currentY - ptsNeeded < this.bottomMargin) {
      this.startNewPage();
    }
  }

  private encodeWinAnsi(str: string): string {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code === 40) out += '\\(';
      else if (code === 41) out += '\\)';
      else if (code === 92) out += '\\\\';
      else if (code >= 32 && code <= 126) out += str[i];
      else if (code >= 160 && code <= 255) {
        out += '\\' + code.toString(8).padStart(3, '0');
      } else {
        const special: Record<number, number> = {
          0x2014: 0x97, // em-dash —
          0x2013: 0x96, // en-dash –
          0x2018: 0x91, // ‘
          0x2019: 0x92, // ’
          0x201c: 0x93, // “
          0x201d: 0x94, // ”
          0x2022: 0x95, // bullet •
          0x2026: 0x85, // ellipsis …
          0x00a0: 0x20, // non-breaking space to space
        };
        const mapped = special[code];
        if (mapped !== undefined) {
          out += '\\' + mapped.toString(8).padStart(3, '0');
        } else {
          // Normalize unmapped characters
          const norm = (str[i] ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          out += norm.length > 0 && norm.charCodeAt(0) < 128 ? norm : ' ';
        }
      }
    }
    return out;
  }

  private estimateCharWidth(ch: string, fontSize: number, isBold: boolean): number {
    const factor = isBold ? 0.58 : 0.52;
    if (ch === ' ' || ch === '.' || ch === ',' || ch === ':' || ch === ';' || ch === '!')
      return fontSize * 0.28;
    if (ch === 'i' || ch === 'l' || ch === 'j' || ch === 't' || ch === '1')
      return fontSize * 0.32;
    if (ch === 'm' || ch === 'w' || ch === 'M' || ch === 'W' || ch === '@' || ch === '—')
      return fontSize * 0.85;
    if (ch >= 'A' && ch <= 'Z') return fontSize * 0.68;
    return fontSize * factor;
  }

  measureText(text: string, fontSize: number, isBold = false): number {
    let width = 0;
    for (const ch of text) {
      width += this.estimateCharWidth(ch, fontSize, isBold);
    }
    return width;
  }

  wrapText(text: string, maxWidth: number, fontSize: number, isBold = false): string[] {
    const paragraphs = text.split('\n');
    const lines: string[] = [];

    for (const para of paragraphs) {
      const words = para.split(/\s+/);
      if (words.length === 0 || (words.length === 1 && words[0] === '')) {
        lines.push('');
        continue;
      }

      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine.length === 0 ? word : currentLine + ' ' + word;
        if (this.measureText(testLine, fontSize, isBold) <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          currentLine = word;
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  drawText(
    text: string,
    x: number,
    y: number,
    options: {
      font?: PdfFont;
      size?: number;
      color?: RgbColor;
    } = {},
  ): void {
    const font = options.font ?? 'F1';
    const size = options.size ?? 10;
    const color = options.color ?? Colors.black;
    const enc = this.encodeWinAnsi(text);

    this.currentOps.push(
      `${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg`,
      `BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${enc}) Tj ET`,
    );
  }

  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    options: {
      fillColor?: RgbColor;
      strokeColor?: RgbColor;
      lineWidth?: number;
    } = {},
  ): void {
    const ops: string[] = [];
    if (options.lineWidth) {
      ops.push(`${options.lineWidth} w`);
    }
    if (options.fillColor) {
      ops.push(
        `${options.fillColor.r.toFixed(3)} ${options.fillColor.g.toFixed(3)} ${options.fillColor.b.toFixed(3)} rg`,
      );
    }
    if (options.strokeColor) {
      ops.push(
        `${options.strokeColor.r.toFixed(3)} ${options.strokeColor.g.toFixed(3)} ${options.strokeColor.b.toFixed(3)} RG`,
      );
    }
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (options.fillColor && options.strokeColor) {
      ops.push('B');
    } else if (options.fillColor) {
      ops.push('f');
    } else if (options.strokeColor) {
      ops.push('S');
    }
    this.currentOps.push(ops.join(' '));
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: {
      color?: RgbColor;
      width?: number;
    } = {},
  ): void {
    const color = options.color ?? Colors.lightGray;
    const width = options.width ?? 1;

    this.currentOps.push(
      `${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} RG`,
      `${width} w`,
      `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  }

  writeParagraph(
    text: string,
    options: {
      x?: number;
      font?: PdfFont;
      size?: number;
      color?: RgbColor;
      maxWidth?: number;
      lineHeight?: number;
      spacingAfter?: number;
    } = {},
  ): void {
    const x = options.x ?? this.margin;
    const font = options.font ?? 'F1';
    const size = options.size ?? 9.5;
    const color = options.color ?? Colors.black;
    const maxWidth = options.maxWidth ?? this.contentWidth;
    const lineHeight = options.lineHeight ?? size * 1.35;
    const spacingAfter = options.spacingAfter ?? 6;
    const isBold = font === 'F2';

    const lines = this.wrapText(text, maxWidth, size, isBold);

    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.drawText(line, x, this.currentY - size, { font, size, color });
      this.currentY -= lineHeight;
    }

    this.currentY -= spacingAfter;
  }

  writeHeading(
    text: string,
    level: 1 | 2 | 3,
    options: { spacingBefore?: number; spacingAfter?: number } = {},
  ): void {
    if (level === 1) {
      const size = 16;
      const spacingBefore = options.spacingBefore ?? 14;
      const spacingAfter = options.spacingAfter ?? 8;
      this.ensureSpace(size + spacingBefore + spacingAfter);
      this.currentY -= spacingBefore;
      this.drawText(text, this.margin, this.currentY - size, {
        font: 'F2',
        size,
        color: Colors.primary,
      });
      this.currentY -= size + spacingAfter;
      this.drawLine(
        this.margin,
        this.currentY + spacingAfter - 2,
        this.margin + this.contentWidth,
        this.currentY + spacingAfter - 2,
        { color: Colors.primary, width: 1.5 },
      );
    } else if (level === 2) {
      const size = 12;
      const spacingBefore = options.spacingBefore ?? 12;
      const spacingAfter = options.spacingAfter ?? 6;
      this.ensureSpace(size + spacingBefore + spacingAfter);
      this.currentY -= spacingBefore;
      this.drawText(text, this.margin, this.currentY - size, {
        font: 'F2',
        size,
        color: Colors.black,
      });
      this.currentY -= size + spacingAfter;
      this.drawLine(
        this.margin,
        this.currentY + spacingAfter - 2,
        this.margin + this.contentWidth,
        this.currentY + spacingAfter - 2,
        { color: Colors.lightGray, width: 0.75 },
      );
    } else {
      const size = 10;
      const spacingBefore = options.spacingBefore ?? 8;
      const spacingAfter = options.spacingAfter ?? 4;
      this.ensureSpace(size + spacingBefore + spacingAfter);
      this.currentY -= spacingBefore;
      this.drawText(text, this.margin, this.currentY - size, {
        font: 'F2',
        size,
        color: Colors.darkGray,
      });
      this.currentY -= size + spacingAfter;
    }
  }

  drawCallout(
    title: string,
    paragraphs: string[],
    options: {
      type?: 'info' | 'warning' | 'danger' | 'success';
      fillColor?: RgbColor;
      strokeColor?: RgbColor;
      titleColor?: RgbColor;
    } = {},
  ): void {
    let fill = Colors.primaryLight;
    let stroke = Colors.primary;
    let titleCol = Colors.primary;

    if (options.type === 'warning') {
      fill = Colors.warningLight;
      stroke = Colors.warning;
      titleCol = Colors.warning;
    } else if (options.type === 'danger') {
      fill = Colors.dangerLight;
      stroke = Colors.danger;
      titleCol = Colors.danger;
    } else if (options.type === 'success') {
      fill = Colors.successLight;
      stroke = Colors.success;
      titleCol = Colors.success;
    }

    fill = options.fillColor ?? fill;
    stroke = options.strokeColor ?? stroke;
    titleCol = options.titleColor ?? titleCol;

    const padX = 10;
    const padY = 8;
    const textWidth = this.contentWidth - padX * 2;
    const titleSize = 10;
    const bodySize = 8.5;
    const bodyLineHeight = bodySize * 1.35;

    // Calcula altura necessária
    let height = padY * 2 + titleSize + 4;
    const wrappedParagraphs = paragraphs.map((p) => this.wrapText(p, textWidth, bodySize, false));
    for (const lines of wrappedParagraphs) {
      height += lines.length * bodyLineHeight + 3;
    }

    this.ensureSpace(height + 10);

    const boxY = this.currentY - height;
    this.drawRect(this.margin, boxY, this.contentWidth, height, {
      fillColor: fill,
      strokeColor: stroke,
      lineWidth: 1,
    });

    let textY = this.currentY - padY - titleSize;
    this.drawText(title, this.margin + padX, textY, {
      font: 'F2',
      size: titleSize,
      color: titleCol,
    });
    textY -= 6;

    for (const lines of wrappedParagraphs) {
      for (const line of lines) {
        textY -= bodyLineHeight;
        this.drawText(line, this.margin + padX, textY, {
          font: 'F1',
          size: bodySize,
          color: Colors.darkGray,
        });
      }
      textY -= 3;
    }

    this.currentY = boxY - 8;
  }

  drawTable(
    headers: string[],
    rows: string[][],
    colWidths: number[],
    options: {
      headerBg?: RgbColor;
      zebraBg?: RgbColor;
      fontSize?: number;
    } = {},
  ): void {
    const fontSize = options.fontSize ?? 8.5;
    const headerBg = options.headerBg ?? Colors.primaryLight;
    const zebraBg = options.zebraBg ?? Colors.veryLightGray;
    const rowHeight = fontSize * 1.7;
    const padX = 5;

    // Header
    this.ensureSpace(rowHeight * 2);
    this.drawRect(this.margin, this.currentY - rowHeight, this.contentWidth, rowHeight, {
      fillColor: headerBg,
      strokeColor: Colors.lightGray,
      lineWidth: 0.75,
    });

    let curX = this.margin;
    for (let i = 0; i < headers.length; i++) {
      const w = colWidths[i] ?? 50;
      const headerText = headers[i] ?? '';
      this.drawText(headerText, curX + padX, this.currentY - rowHeight + 4, {
        font: 'F2',
        size: fontSize,
        color: Colors.primary,
      });
      curX += w;
    }
    this.currentY -= rowHeight;

    // Rows
    for (let r = 0; r < rows.length; r++) {
      this.ensureSpace(rowHeight);
      const isZebra = r % 2 === 1;
      if (isZebra) {
        this.drawRect(this.margin, this.currentY - rowHeight, this.contentWidth, rowHeight, {
          fillColor: zebraBg,
        });
      }
      this.drawLine(
        this.margin,
        this.currentY - rowHeight,
        this.margin + this.contentWidth,
        this.currentY - rowHeight,
        { color: Colors.lightGray, width: 0.5 },
      );

      curX = this.margin;
      const row = rows[r] ?? [];
      for (let c = 0; c < row.length; c++) {
        const w = colWidths[c] ?? 50;
        const val = row[c] ?? '';
        this.drawText(val, curX + padX, this.currentY - rowHeight + 4, {
          font: 'F1',
          size: fontSize,
          color: Colors.black,
        });
        curX += w;
      }
      this.currentY -= rowHeight;
    }

    this.currentY -= 6;
  }

  build(): Buffer {
    if (this.currentOps.length > 0) {
      this.pages.push(this.currentOps.join('\n'));
      this.currentOps = [];
    }

    const totalPages = this.pages.length;

    // Insere rodapé e cabeçalho leve em todas as páginas
    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      const footerOps = [
        '0.8 0.8 0.8 RG 0.5 w',
        `${this.margin} 34 m ${(this.margin + this.contentWidth).toFixed(2)} 34 l S`,
        '0.45 0.45 0.45 rg',
        `BT /F1 8 Tf ${this.margin} 22 Td (${this.encodeWinAnsi('Queimando Gordura 1.0 — Relatório de Acompanhamento (30 Dias)')}) Tj ET`,
        `BT /F1 8 Tf ${(this.margin + this.contentWidth - 65).toFixed(2)} 22 Td (${this.encodeWinAnsi(`Página ${pageNum} de ${totalPages}`)}) Tj ET`,
      ].join('\n');
      const pageContent = this.pages[i] ?? '';
      this.pages[i] = pageContent + '\n' + footerOps;
    }

    const objects: string[] = [];
    const addObject = (s: string) => {
      objects.push(s);
      return objects.length;
    };

    // 1: Catalog
    addObject('<< /Type /Catalog /Pages 2 0 R >>');

    // 2: Pages
    const kids: string[] = [];
    for (let i = 0; i < totalPages; i++) {
      kids.push(`${6 + i * 2} 0 R`);
    }
    addObject(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>`);

    // 3: Font F1 (Helvetica)
    addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    // 4: Font F2 (Helvetica-Bold)
    addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    );
    // 5: Font F3 (Helvetica-Oblique)
    addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>',
    );

    // Para cada página: Objeto Page e Objeto Contents
    for (let i = 0; i < totalPages; i++) {
      const contentObjId = 7 + i * 2;
      addObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>`,
      );
      const pageStr = this.pages[i] ?? '';
      const streamBuf = Buffer.from(pageStr, 'latin1');
      addObject(`<< /Length ${streamBuf.length} >>\nstream\n${pageStr}\nendstream`);
    }

    let body = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets: number[] = [0];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(Buffer.byteLength(body, 'latin1'));
      body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(body, 'latin1');
    body += `xref\n0 ${objects.length + 1}\n`;
    body += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
      body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(body, 'latin1');
  }
}
