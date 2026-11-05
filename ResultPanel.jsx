import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check, Copy, Download, Edit3, FileText, RefreshCw,
  Save, Send, Sparkles, Star,
} from 'lucide-react';
import MermaidPreview from './MermaidPreview';
import { copyToClipboard, downloadText } from '../utils/export';
import { FORMATS } from '../data/formats';

export default function ResultPanel({ result, onChange, onRefine, onRegenerate, busy, onSave, saved, onToggleFavorite }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(result?.content || '');
  const [instruction, setInstruction] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [flipped, setFlipped] = useState({});
  const [notice, setNotice] = useState('');
  const formatLabel = FORMATS.find((item) => item.id === result?.format)?.label || 'Transformation';
  const generatedAt = useMemo(() => result?.created_at ? new Date(result.created_at).toLocaleString() : 'Just now', [result?.created_at]);
  const isFallback = result?.mode === 'demo-fallback' || result?.mode === 'demo';

  async function handleCopy() {
    try {
      await copyToClipboard(result?.content || '');
      setNotice('Copied to clipboard');
    } catch { setNotice('Clipboard access was blocked by this browser.'); }
    window.setTimeout(() => setNotice(''), 2000);
  }

  function saveEdit() {
    onChange({ ...result, content: draft });
    setEditing(false);
  }

  async function submitRefine(event) {
    event.preventDefault();
    if (!instruction.trim()) return;
    await onRefine(instruction.trim());
    setInstruction('');
  }

  return (
    <section className="result-panel">
      <div className="result-heading-row">
        <div>
          <div className="eyebrow"><span className="status-dot" /> TRANSFORMATION RESULT</div>
          <h2>{result.title || formatLabel}</h2>
          <p>{formatLabel} <span className="meta-dot">·</span> {generatedAt} <span className="meta-dot">·</span> <span className={isFallback ? 'demo-label' : 'ai-label'}>{isFallback ? 'Local fallback' : 'Gemini AI'}</span></p>
        </div>
        <div className="result-heading-actions">
          <button className={`icon-button ${result.favorite ? 'favorite-active' : ''}`} title="Toggle favorite" onClick={onToggleFavorite}><Star size={16} fill={result.favorite ? 'currentColor' : 'none'} /></button>
          <button className="icon-button" title={saved ? 'Saved' : 'Save project'} onClick={onSave}><Save size={16} /></button>
        </div>
      </div>

      {isFallback && <div className="inline-notice warning"><span className="status-dot muted" /> Gemini is temporarily unavailable or not configured. DataMind generated a local result so the workspace is not blank.</div>}
      {result.ai_error && <div className="small-muted">{result.ai_error}</div>}

      <div className="result-toolbar">
        <div className="result-tabs"><span className="result-tab active"><Sparkles size={13} /> Result</span>{result.mermaid && <span className="result-tab"><span className="tiny-dot" /> Visual</span>}</div>
        <div className="result-actions">
          <button onClick={handleCopy}><Copy size={13} /> Copy</button>
          <button onClick={() => downloadText(result.content || '', 'datamind-result.md', 'text/markdown;charset=utf-8')}><Download size={13} /> Export</button>
          <button onClick={onRegenerate} disabled={busy}><RefreshCw size={13} className={busy ? 'spin' : ''} /> Regenerate</button>
        </div>
      </div>
      {notice && <div className="inline-notice"><Check size={13} /> {notice}</div>}

      {result.mermaid && <MermaidPreview code={result.mermaid} title={result.title} />}

      {result.cards?.length > 0 && result.format === 'flashcards' && (
        <div className="flashcard-grid">
          {result.cards.map((card, index) => (
            <button className={`flashcard ${flipped[index] ? 'flipped' : ''}`} key={`${card.question}-${index}`} onClick={() => setFlipped((current) => ({ ...current, [index]: !current[index] }))}>
              <span>{flipped[index] ? 'ANSWER' : `CARD ${String(index + 1).padStart(2, '0')}`}</span>
              <strong>{flipped[index] ? card.answer : card.question}</strong>
              <small>Click to {flipped[index] ? 'see question' : 'reveal answer'}</small>
            </button>
          ))}
        </div>
      )}

      {result.cards?.length > 0 && ['infographic', 'presentation'].includes(result.format) && (
        <div className="infographic-grid">
          {result.cards.map((card, index) => <article className="info-card" key={`${card.title}-${index}`}><span className="info-card-number">{String(index + 1).padStart(2, '0')}</span><h3>{card.title || `Key point ${index + 1}`}</h3><p>{card.body || card.answer || ''}</p></article>)}
        </div>
      )}

      {result.table?.headers?.length > 0 && (
        <div className="table-wrap"><table className="comparison-table"><thead><tr>{result.table.headers.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead><tbody>{(result.table.rows || []).map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
      )}

      <div className="content-card">
        <div className="content-card-head"><div><FileText size={15} /><strong>Written breakdown</strong></div><button className="text-button" onClick={() => { setDraft(result.content || ''); setEditing((v) => !v); }}><Edit3 size={13} /> {editing ? 'Cancel edit' : 'Edit content'}</button></div>
        {editing ? (
          <div className="edit-content"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Edit generated content" /><div><button className="secondary-button small" onClick={() => setEditing(false)}>Cancel</button><button className="primary-button small" onClick={saveEdit}><Check size={13} /> Save changes</button></div></div>
        ) : (
          <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content || 'No written explanation was generated.'}</ReactMarkdown></div>
        )}
      </div>

      {result.cards?.length > 0 && !['flashcards', 'infographic', 'presentation'].includes(result.format) && (
        <div className="secondary-cards"><h3>Key learning cards</h3><div>{result.cards.map((card, index) => <article key={index}><strong>{card.question || card.title}</strong><p>{card.answer || card.body}</p></article>)}</div></div>
      )}

      <div className={`assistant-box ${assistantOpen ? 'assistant-open' : ''}`}>
        <button className="assistant-toggle" onClick={() => setAssistantOpen((v) => !v)}><span className="assistant-orb"><Sparkles size={15} /></span><span><strong>Ask DataMind</strong><small>Refine or explore this result</small></span><span className="assistant-chevron">{assistantOpen ? '−' : '+'}</span></button>
        {assistantOpen && <form className="assistant-form" onSubmit={submitRefine}><input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="e.g. Explain this in Hinglish or make it shorter..." /><button className="primary-button" disabled={busy || !instruction.trim()}>{busy ? <RefreshCw size={14} className="spin" /> : <Send size={14} />} Ask</button><div className="assistant-suggestions"><button type="button" onClick={() => setInstruction('Explain this in simple Hinglish.')}>Explain in Hinglish</button><button type="button" onClick={() => setInstruction('Make this shorter without removing important facts.')}>Make it shorter</button><button type="button" onClick={() => setInstruction('Create five quiz questions from this content.')}>Create quiz questions</button></div></form>}
      </div>
    </section>
  );
}
