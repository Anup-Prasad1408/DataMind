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
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', clone.getAttribute('viewBox') || `0 0 ${width} ${height}`);
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Keep the downloaded image independent of app CSS and theme variables.
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    text,.nodeLabel,.edgeLabel,.label,.labelText{fill:#202943;color:#202943;font-family:Arial,sans-serif}
    .node rect,.node polygon,.node circle,.node path{stroke-width:1.5px}
    .edgeLabel{background:#fff}
  `;
  clone.insertBefore(style, clone.firstChild);
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(height));
  background.setAttribute('fill', '#ffffff');
  clone.insertBefore(background, clone.firstChild);

  const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(svgBlob);
  let bitmap = null;
  try {
    // createImageBitmap avoids several SVG <img> decode/download races.
    if (typeof createImageBitmap === 'function') {
      try { bitmap = await createImageBitmap(svgBlob); } catch { bitmap = null; }
    }
    const image = bitmap || await loadImage(url);
    const maxDimension = 12000;
    const maxPixels = 48_000_000;
    const scale = Math.max(1, Math.min(
      3,
      maxDimension / width,
      maxDimension / height,
      Math.sqrt(maxPixels / Math.max(1, width * height)),
    ));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not create the PNG canvas. Download the SVG instead.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await canvasToPng(canvas);
    if (!png || png.size < 100) throw new Error('The browser returned an empty PNG. Please try SVG export.');
    downloadBlob(png, filename);
  } finally {
    if (bitmap?.close) bitmap.close();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
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

/** Export every visual card or every source-table row without fixed-height clipping. */
export async function exportResultVisual({ title, cards = [], table = null, format = 'infographic' }) {
  const hasTable = Boolean(table?.headers?.length);
  if ((!Array.isArray(cards) || !cards.length) && !hasTable) {
    throw new Error('There is no visual content available to export.');
  }

  const width = 1800;
  const padding = 76;
  const gap = 28;
  const headerHeight = 190;
  const scratch = document.createElement('canvas');
  const measure = scratch.getContext('2d');
  if (!measure) throw new Error('Could not create an image canvas.');

  let canvasHeight = headerHeight + padding;
  let tableLayout = null;
  let cardLayout = null;

  if (hasTable) {
    const headers = table.headers.map((value) => String(value ?? ''));
    const sourceRows = Array.isArray(table.rows) ? table.rows : [];
    const columnCount = Math.max(1, headers.length);
    const colWidth = (width - padding * 2) / columnCount;
    const fontSize = columnCount >= 6 ? 17 : columnCount >= 4 ? 19 : 21;
    const lineHeight = fontSize + 9;
    const allRows = [headers, ...sourceRows];
    const rowLayouts = allRows.map((row, rowIndex) => {
      const cells = headers.map((_, colIndex) => {
        measure.font = rowIndex === 0 ? `700 ${fontSize}px Arial` : `${fontSize}px Arial`;
        return wrapCanvasText(measure, String(row?.[colIndex] ?? ''), colWidth - 30);
      });
      const maxLines = Math.max(1, ...cells.map((lines) => lines.length));
      return { cells, height: Math.max(58, maxLines * lineHeight + 28), rowIndex };
    });
    tableLayout = { headers, rowLayouts, colWidth, fontSize, lineHeight };
    canvasHeight += rowLayouts.reduce((sum, row) => sum + row.height, 0) + 30;
  } else {
    const columns = 2;
    const cardWidth = (width - padding * 2 - gap) / columns;
    const prepared = cards.map((card, index) => {
      const heading = String(card.question || card.title || `Key point ${index + 1}`);
      const body = String(card.answer || card.body || '');
      measure.font = '700 25px Arial';
      const headingLines = wrapCanvasText(measure, heading, cardWidth - 64);
      measure.font = '18px Arial';
      const bodyLines = wrapCanvasText(measure, body, cardWidth - 64);
      const height = Math.max(240, 112 + headingLines.length * 34 + bodyLines.length * 27 + 54);
      return { headingLines, bodyLines, height, index };
    });
    const rowHeights = [];
    for (let i = 0; i < prepared.length; i += columns) {
      rowHeights.push(Math.max(...prepared.slice(i, i + columns).map((item) => item.height)));
    }
    cardLayout = { prepared, cardWidth, rowHeights, columns };
    canvasHeight += rowHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, rowHeights.length - 1) * gap + 30;
  }

  // Prevent browser canvas limits from silently producing an empty file.
  if (canvasHeight > 24000) {
    throw new Error('This visual is too tall for one PNG. Export the full Markdown result or choose fewer cards.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.ceil(canvasHeight);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Could not create an image canvas.');

  context.fillStyle = '#f6f7fb';
  context.fillRect(0, 0, width, canvas.height);
  context.fillStyle = '#202943';
  context.font = '700 44px Arial, sans-serif';
  context.fillText(String(title || 'DataMind visual').slice(0, 90), padding, 82);
  context.fillStyle = '#69738b';
  context.font = '21px Arial, sans-serif';
  context.fillText(`${String(format).replaceAll('_', ' ')} · Complete export · ${hasTable ? tableLayout.rowLayouts.length - 1 : cards.length} records`, padding, 126);
  context.fillStyle = '#858be3';
  context.fillRect(padding, 150, 110, 5);

  if (hasTable && tableLayout) {
    let y = headerHeight;
    const { rowLayouts, colWidth, fontSize, lineHeight } = tableLayout;
    rowLayouts.forEach((rowLayout) => {
      const { rowIndex, height, cells } = rowLayout;
      context.fillStyle = rowIndex === 0 ? '#e4e8ff' : rowIndex % 2 ? '#ffffff' : '#f0f2f8';
      context.fillRect(padding, y, width - padding * 2, height);
      cells.forEach((cellLines, colIndex) => {
        context.save();
        context.beginPath();
        context.rect(padding + colIndex * colWidth + 8, y + 4, colWidth - 16, height - 8);
        context.clip();
        context.fillStyle = '#202943';
        context.font = rowIndex === 0 ? `700 ${fontSize}px Arial` : `${fontSize}px Arial`;
        cellLines.forEach((line, lineIndex) => {
          context.fillText(line, padding + colIndex * colWidth + 14, y + 25 + lineIndex * lineHeight);
        });
        context.restore();
        context.strokeStyle = '#d9deeb';
        context.lineWidth = 1;
        context.strokeRect(padding + colIndex * colWidth, y, colWidth, height);
      });
      y += height;
    });
  } else if (cardLayout) {
    let y = headerHeight;
    let cardIndex = 0;
    for (const rowHeight of cardLayout.rowHeights) {
      for (let column = 0; column < cardLayout.columns && cardIndex < cardLayout.prepared.length; column++, cardIndex++) {
        const item = cardLayout.prepared[cardIndex];
        const x = padding + column * (cardLayout.cardWidth + gap);
        roundedRect(context, x, y, cardLayout.cardWidth, rowHeight, 20);
        context.fillStyle = '#ffffff';
        context.fill();
        context.strokeStyle = '#dce1ed';
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = '#6b65cf';
        context.font = '700 15px Arial';
        context.fillText(`ITEM ${String(item.index + 1).padStart(2, '0')}`, x + 30, y + 42);
        context.fillStyle = '#202943';
        context.font = '700 25px Arial';
        item.headingLines.forEach((line, lineIndex) => context.fillText(line, x + 30, y + 84 + lineIndex * 34));
        context.fillStyle = '#59647d';
        context.font = '18px Arial';
        const bodyStart = y + 104 + item.headingLines.length * 34;
        item.bodyLines.forEach((line, lineIndex) => context.fillText(line, x + 30, bodyStart + lineIndex * 27));
      }
      y += rowHeight + gap;
    }
  }

  const png = await canvasToPng(canvas);
  if (!png || png.size < 100) throw new Error('The browser returned an empty PNG. Please try again.');
  downloadBlob(png, `${safeFilename(title)}-${safeFilename(format)}.png`);
}


function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapSvgText(value, maxCharacters) {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function svgTextLines(lines, x, y, options = {}) {
  const {
    fontSize = 18,
    lineHeight = 26,
    fill = '#202943',
    weight = 400,
    maxLines = 1000,
  } = options;
  return lines.slice(0, maxLines).map((line, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`
  ).join('');
}

/** Export every card or table row as a self-contained vector SVG. */
export function exportResultVisualSvg({ title, cards = [], table = null, format = 'infographic' }) {
  const width = 1800;
  const padding = 76;
  const gap = 28;
  const headerHeight = 190;
  const elements = [];
  let height = headerHeight + padding;
  const hasTable = Boolean(table?.headers?.length);

  elements.push(`<rect width="100%" height="100%" fill="#f6f7fb"/>`);
  elements.push(`<text x="${padding}" y="82" font-family="Arial,sans-serif" font-size="44" font-weight="700" fill="#202943">${escapeXml(String(title || 'DataMind visual').slice(0, 90))}</text>`);
  const total = hasTable ? (table.rows || []).length : cards.length;
  elements.push(`<text x="${padding}" y="126" font-family="Arial,sans-serif" font-size="21" fill="#69738b">${escapeXml(String(format).replaceAll('_', ' '))} · Complete export · ${total} records</text>`);
  elements.push(`<rect x="${padding}" y="150" width="110" height="5" rx="2" fill="#858be3"/>`);

  if (hasTable) {
    const headers = table.headers.map((value) => String(value ?? ''));
    const rows = Array.isArray(table.rows) ? table.rows : [];
    const colCount = Math.max(1, headers.length);
    const colWidth = (width - padding * 2) / colCount;
    const fontSize = colCount >= 6 ? 17 : colCount >= 4 ? 19 : 21;
    const lineHeight = fontSize + 9;
    const allRows = [headers, ...rows];
    let y = headerHeight;

    allRows.forEach((row, rowIndex) => {
      const cells = headers.map((_, colIndex) => wrapSvgText(row?.[colIndex] ?? '', Math.max(10, Math.floor((colWidth - 30) / (fontSize * 0.56)))));
      const maxLines = Math.max(1, ...cells.map((lines) => lines.length));
      const rowHeight = Math.max(58, maxLines * lineHeight + 28);
      elements.push(`<rect x="${padding}" y="${y}" width="${width - padding * 2}" height="${rowHeight}" fill="${rowIndex === 0 ? '#e4e8ff' : rowIndex % 2 ? '#ffffff' : '#f0f2f8'}" stroke="#d9deeb"/>`);
      cells.forEach((lines, colIndex) => {
        const x = padding + colIndex * colWidth;
        elements.push(`<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="none" stroke="#d9deeb"/>`);
        elements.push(svgTextLines(lines, x + 14, y + 25, {
          fontSize,
          lineHeight,
          weight: rowIndex === 0 ? 700 : 400,
          maxLines,
        }));
      });
      y += rowHeight;
    });
    height = y + padding;
  } else {
    const columns = 2;
    const cardWidth = (width - padding * 2 - gap) / columns;
    const prepared = cards.map((card, index) => {
      const heading = String(card.question || card.title || `Key point ${index + 1}`);
      const body = String(card.answer || card.body || '');
      const headingLines = wrapSvgText(heading, Math.floor((cardWidth - 64) / 14));
      const bodyLines = wrapSvgText(body, Math.floor((cardWidth - 64) / 10));
      const cardHeight = Math.max(240, 112 + headingLines.length * 34 + bodyLines.length * 27 + 54);
      return { headingLines, bodyLines, cardHeight, index };
    });
    const rowHeights = [];
    for (let index = 0; index < prepared.length; index += columns) {
      rowHeights.push(Math.max(...prepared.slice(index, index + columns).map((item) => item.cardHeight)));
    }
    let y = headerHeight;
    let cardIndex = 0;
    rowHeights.forEach((rowHeight) => {
      for (let column = 0; column < columns && cardIndex < prepared.length; column++, cardIndex++) {
        const item = prepared[cardIndex];
        const x = padding + column * (cardWidth + gap);
        elements.push(`<rect x="${x}" y="${y}" width="${cardWidth}" height="${rowHeight}" rx="20" fill="#ffffff" stroke="#dce1ed" stroke-width="2"/>`);
        elements.push(`<text x="${x + 30}" y="${y + 42}" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#6b65cf">ITEM ${String(item.index + 1).padStart(2, '0')}</text>`);
        elements.push(svgTextLines(item.headingLines, x + 30, y + 84, { fontSize: 25, lineHeight: 34, weight: 700 }));
        const bodyStart = y + 104 + item.headingLines.length * 34;
        elements.push(svgTextLines(item.bodyLines, x + 30, bodyStart, { fontSize: 18, lineHeight: 27, fill: '#59647d' }));
      }
      y += rowHeight + gap;
    });
    height = y + padding;
  }

  if (height > 30000) throw new Error('This SVG is very large. Export the full Markdown result or split the visual into smaller groups.');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title || 'DataMind visual')}">${elements.join('')}</svg>`;
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeFilename(title)}-${safeFilename(format)}.svg`);
}
