function safeFilename(value) {
  return String(value || 'datamind-export')
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'datamind-export';
}

export async function copyToClipboard(value) {
  const text = String(value ?? '');
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  area.style.top = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('Clipboard copy failed.');
}

/**
 * Starts a same-origin Blob download and keeps the object URL alive long enough
 * for browsers to finish opening the download stream (1 second was too short
 * on some systems and caused apparently successful but empty downloads).
 */
export function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob)) throw new Error('Nothing is available to download.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename(filename);
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);

  try {
    link.click();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw new Error('The browser could not start the download. Please allow downloads for this site.');
  } finally {
    link.remove();
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([String(text ?? '')], { type }), filename);
}

function svgDimensions(svgElement) {
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    const values = viewBox.trim().split(/[ ,]+/).map(Number);
    if (values.length === 4 && values.every(Number.isFinite)) {
      return {
        width: Math.max(1, Math.ceil(values[2])),
        height: Math.max(1, Math.ceil(values[3])),
      };
    }
  }

  const bounds = svgElement.getBoundingClientRect();
  const width = Number.parseFloat(svgElement.getAttribute('width')) || bounds.width || 1000;
  const height = Number.parseFloat(svgElement.getAttribute('height')) || bounds.height || 700;
  return {
    width: Math.max(1, Math.ceil(width)),
    height: Math.max(1, Math.ceil(height)),
  };
}

function inlineSvgStyles(source, clone) {
  const sourceNodes = [source, ...source.querySelectorAll('*')];
  const cloneNodes = [clone, ...clone.querySelectorAll('*')];
  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index];
    if (!target || !(node instanceof Element)) return;
    const computed = window.getComputedStyle(node);
    const declarations = [];
    for (const property of computed) {
      const value = computed.getPropertyValue(property);
      if (value) declarations.push(`${property}:${value}`);
    }
    if (declarations.length) target.setAttribute('style', declarations.join(';'));
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The browser could not render this diagram as an image. Download the SVG instead.'));
    image.src = url;
  });
}

async function canvasToPng(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) return blob;
  const dataUrl = canvas.toDataURL('image/png');
  const response = await fetch(dataUrl);
  return response.blob();
}

export function downloadSvg(svgElement, filename = 'datamind-diagram.svg') {
  if (!svgElement) throw new Error('No rendered diagram is available.');
  const clone = svgElement.cloneNode(true);
  const { width, height } = svgDimensions(svgElement);
  inlineSvgStyles(svgElement, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Add explicit text styling so exported SVGs do not depend on the website CSS.
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = 'text,.nodeLabel,.edgeLabel,.label,.labelText{fill:#202943;color:#202943;font-family:Arial,sans-serif}.edgeLabel{background:#fff}';
  clone.insertBefore(style, clone.firstChild);
  const source = new XMLSerializer().serializeToString(clone);
  downloadBlob(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

export async function exportSvgAsPng(svgElement, filename = 'datamind-diagram.png') {
  if (!svgElement) throw new Error('No rendered diagram is available.');
  const clone = svgElement.cloneNode(true);
  const { width, height } = svgDimensions(svgElement);
  inlineSvgStyles(svgElement, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', clone.getAttribute('viewBox') || `0 0 ${width} ${height}`);
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = 'text,.nodeLabel,.edgeLabel,.label,.labelText{fill:#202943;color:#202943;font-family:Arial,sans-serif}.edgeLabel{background:#fff}';
  clone.insertBefore(style, clone.firstChild);

  const source = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await loadImage(url);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create an image canvas. Download the SVG instead.');
    context.scale(scale, scale);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    downloadBlob(await canvasToPng(canvas), filename);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function wrapCanvasText(context, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

/** Export cards/table as a clean, printable PNG without DOM screenshot libraries. */
export async function exportResultVisual({ title, cards = [], table = null, format = 'infographic' }) {
  if ((!Array.isArray(cards) || !cards.length) && !table?.headers?.length) {
    throw new Error('There is no visual content available to export.');
  }

  const canvas = document.createElement('canvas');
  const width = 1600;
  const padding = 72;
  const gap = 28;
  const columns = table?.headers?.length ? 1 : 2;
  const cardWidth = (width - padding * 2 - gap * (columns - 1)) / columns;
  const estimatedCardHeight = 300;
  const count = table?.headers?.length ? 1 : cards.length;
  const rows = table?.headers?.length ? 1 : Math.ceil(count / columns);
  const height = Math.max(650, 210 + rows * (estimatedCardHeight + gap) + padding);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create an image canvas.');

  context.fillStyle = '#f6f7fb';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#202943';
  context.font = '700 42px Arial, sans-serif';
  context.fillText(String(title || 'DataMind visual').slice(0, 70), padding, 85);
  context.fillStyle = '#69738b';
  context.font = '20px Arial, sans-serif';
  context.fillText(`${String(format).replaceAll('_', ' ')} · Created with DataMind`, padding, 125);

  if (table?.headers?.length) {
    const x = padding;
    let y = 175;
    const columnsCount = table.headers.length;
    const colWidth = (width - padding * 2) / columnsCount;
    const allRows = [table.headers, ...(table.rows || [])];
    allRows.forEach((row, rowIndex) => {
      const cellLines = row.map((cell) => {
        context.font = rowIndex === 0 ? '700 18px Arial' : '16px Arial';
        return wrapCanvasText(context, String(cell ?? ''), colWidth - 28);
      });
      const rowHeight = Math.max(70, ...cellLines.map((lines) => lines.length * 25 + 28));
      context.fillStyle = rowIndex === 0 ? '#e8eaff' : (rowIndex % 2 ? '#ffffff' : '#f0f2f8');
      context.fillRect(x, y, width - padding * 2, rowHeight);
      row.forEach((_, colIndex) => {
        context.fillStyle = '#26314d';
        context.font = rowIndex === 0 ? '700 18px Arial' : '16px Arial';
        cellLines[colIndex].forEach((line, lineIndex) => context.fillText(line, x + colIndex * colWidth + 14, y + 36 + lineIndex * 25));
        context.strokeStyle = '#d9deeb';
        context.strokeRect(x + colIndex * colWidth, y, colWidth, rowHeight);
      });
      y += rowHeight;
    });
  } else {
    cards.forEach((card, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = padding + column * (cardWidth + gap);
      const y = 175 + row * (estimatedCardHeight + gap);
      roundedRect(context, x, y, cardWidth, estimatedCardHeight, 22);
      context.fillStyle = '#ffffff';
      context.fill();
      context.strokeStyle = '#dce1ed';
      context.lineWidth = 2;
      context.stroke();

      const question = card.question || card.title || `Key point ${index + 1}`;
      const answer = card.answer || card.body || '';
      context.fillStyle = '#6b65cf';
      context.font = '700 16px Arial';
      context.fillText(`CARD ${String(index + 1).padStart(2, '0')}`, x + 28, y + 48);
      context.fillStyle = '#202943';
      context.font = '700 25px Arial';
      const titleLines = wrapCanvasText(context, question, cardWidth - 56).slice(0, 3);
      titleLines.forEach((line, lineIndex) => context.fillText(line, x + 28, y + 94 + lineIndex * 34));
      context.fillStyle = '#59647d';
      context.font = '18px Arial';
      const bodyLines = wrapCanvasText(context, answer, cardWidth - 56).slice(0, 5);
      const bodyY = y + 120 + titleLines.length * 34;
      bodyLines.forEach((line, lineIndex) => context.fillText(line, x + 28, bodyY + lineIndex * 27));
    });
  }

  downloadBlob(await canvasToPng(canvas), 'datamind-visual.png');
}
