import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { Check, Code2, Copy, Download, Maximize2, Minus, Plus, X } from 'lucide-react';
import { copyToClipboard, downloadBlob, exportSvgAsPng } from '../utils/export';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  fontFamily: 'DM Sans, Arial, sans-serif',
  flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: true, nodeSpacing: 42, rankSpacing: 48 },
  themeVariables: {
    background: '#ffffff',
    primaryColor: '#eef0ff',
    primaryTextColor: '#202943',
    primaryBorderColor: '#858be3',
    secondaryColor: '#e4f5ef',
    secondaryTextColor: '#202943',
    secondaryBorderColor: '#63ad98',
    tertiaryColor: '#fff3e4',
    tertiaryTextColor: '#202943',
    tertiaryBorderColor: '#d7a567',
    lineColor: '#8791b2',
    textColor: '#202943',
    edgeLabelBackground: '#ffffff',
    fontSize: '14px',
  },
});

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

export default function MermaidPreview({ code, title }) {
  const [markup, setMarkup] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const hostRef = useRef(null);
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    let cancelled = false;
    const source = normalizeCode(code);
    if (!source) {
      setMarkup('');
      setError('No diagram code was returned.');
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const { svg } = await mermaid.render(`datamind-${rawId}`, source);
        if (cancelled) return;
        const clean = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['foreignObject'],
          ADD_ATTR: ['dominant-baseline', 'alignment-baseline', 'marker-end', 'marker-start', 'text-anchor'],
        });
        setMarkup(clean);
        setError('');
      } catch (err) {
        if (cancelled) return;
        console.error('Mermaid render failed:', err);
        setMarkup('');
        setError(String(err?.message || 'Invalid Mermaid syntax. Open Code to inspect the diagram source.').split('\n')[0]);
      }
    })();
    return () => { cancelled = true; };
  }, [code, rawId]);

  async function handleCopy() {
    try {
      await copyToClipboard(normalizeCode(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setError(err.message || 'Clipboard access was blocked.');
    }
  }

  function handleDownloadSvg() {
    const svg = hostRef.current?.querySelector('svg');
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    downloadBlob(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), 'datamind-diagram.svg');
  }

  return (
    <section className={`diagram-shell ${fullscreen ? 'diagram-fullscreen' : ''}`}>
      <div className="diagram-toolbar">
        <div className="diagram-title"><span className="live-dot" />{title || 'Diagram preview'}</div>
        <div className="diagram-actions">
          <button className="diagram-action" onClick={() => setShowCode((v) => !v)} title="Toggle source"><Code2 size={14} /><span>Code</span></button>
          <button className="diagram-action" onClick={handleCopy} title="Copy Mermaid code">{copied ? <Check size={14} /> : <Copy size={14} />}<span>{copied ? 'Copied' : 'Copy code'}</span></button>
          <button className="diagram-action" onClick={() => setZoom((v) => Math.max(0.55, +(v - 0.1).toFixed(2)))} title="Zoom out"><Minus size={14} /></button>
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
          <button className="diagram-action" onClick={() => setZoom((v) => Math.min(1.8, +(v + 0.1).toFixed(2)))} title="Zoom in"><Plus size={14} /></button>
          <button className="diagram-action" onClick={handleDownloadSvg} title="Download SVG"><Download size={14} /><span>SVG</span></button>
          <button className="diagram-action" onClick={() => exportSvgAsPng(hostRef.current?.querySelector('svg')).catch((err) => setError(err.message))} title="Download PNG"><span>PNG</span></button>
          <button className="diagram-action" onClick={() => setFullscreen((v) => !v)} title="Fullscreen">{fullscreen ? <X size={14} /> : <Maximize2 size={14} />}</button>
        </div>
      </div>
      {showCode && <pre className="mermaid-code"><code>{normalizeCode(code)}</code></pre>}
      <div className="diagram-canvas" ref={hostRef}>
        {error ? (
          <div className="diagram-error"><Code2 size={24} /><strong>Diagram preview unavailable</strong><p>{error}</p><small>You can still open Code and copy the Mermaid source.</small></div>
        ) : (
          <div className="diagram-art" style={{ transform: `scale(${zoom})` }} dangerouslySetInnerHTML={{ __html: markup }} />
        )}
      </div>
      {fullscreen && <button className="fullscreen-exit" onClick={() => setFullscreen(false)}>Exit fullscreen <X size={14} /></button>}
    </section>
  );
}
