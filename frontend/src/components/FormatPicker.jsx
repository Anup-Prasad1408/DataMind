import { Check } from 'lucide-react';
import { FORMATS } from '../data/formats';

export default function FormatPicker({ value, onChange, compact = false }) {
  return (
    <div className={`format-grid ${compact ? 'format-grid-compact' : ''}`}>
      {FORMATS.map(({ id, label, description, icon: Icon, visual }) => (
        <button key={id} type="button" className={`format-option ${value === id ? 'selected' : ''}`} onClick={() => onChange(id)}>
          <span className="format-icon"><Icon size={18} /></span>
          <span className="format-text"><strong>{label}</strong><small>{description}</small></span>
          {visual && <span className="format-visual-dot" title="Visual output" />}
          {value === id && <span className="format-check"><Check size={13} /></span>}
        </button>
      ))}
    </div>
  );
}
