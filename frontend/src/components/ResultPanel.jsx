import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  Check,
  Copy,
  Download,
  Edit3,
  FileText,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Star,
} from 'lucide-react';

import MermaidPreview from './MermaidPreview';

import {
  copyToClipboard,
  downloadText,
} from '../utils/export';

import { FORMATS } from '../data/formats';


export default function ResultPanel({
  result,
  onChange,
  onRefine,
  onRegenerate,
  busy,
  onSave,
  saved,
  onToggleFavorite,
}) {
  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    draft,
    setDraft,
  ] = useState(
    result?.content || ''
  );

  const [
    assistantText,
    setAssistantText,
  ] = useState('');

  const [
    assistantOpen,
    setAssistantOpen,
  ] = useState(false);

  const [
    flipped,
    setFlipped,
  ] = useState({});

  const [
    notice,
    setNotice,
  ] = useState('');

  const formatLabel =
    FORMATS.find(
      (item) =>
        item.id ===
        result?.format
    )?.label ||
    'Transformation';

  const hasDiagram =
    Boolean(
      result?.mermaid
    );

  const generatedAt =
    useMemo(
      () =>
        result?.created_at
          ? new Date(
              result.created_at
            ).toLocaleString()
          : 'Just now',
      [
        result?.created_at,
      ]
    );


  async function handleCopy() {
    try {

      await copyToClipboard(
        result?.content ||
        result?.mermaid ||
        ''
      );

      setNotice(
        'Copied to clipboard'
      );

    } catch {

      setNotice(
        'Clipboard access was blocked by this browser'
      );
    }

    window.setTimeout(
      () =>
        setNotice(''),
      2200
    );
  }


  function saveEdit() {
    onChange({
      ...result,
      content: draft,
    });

    setEditing(false);
  }


  async function handleAssistant(
    event
  ) {
    event.preventDefault();

    if (
      !assistantText.trim()
    ) {
      return;
    }

    await onRefine(
      assistantText.trim()
    );

    setAssistantText('');
  }


  const isFallback =
    result?.mode ===
    'demo-fallback';

  const isAi =
    result?.mode ===
    'ai';


  return (
    <section className="result-panel">

      <div className="result-heading-row">

        <div>

          <div className="eyebrow">
            <span className="status-dot" />
            TRANSFORMATION RESULT
          </div>

          <h2>
            {result.title ||
              formatLabel}
          </h2>

          <p>
            {formatLabel}
            {' · '}
            {generatedAt}
            {' · '}

            <span
              className={
                isAi
                  ? 'ai-label'
                  : isFallback
                    ? 'demo-label'
                    : 'demo-label'
              }
            >
              {isAi
                ? 'Gemini AI'
                : isFallback
                  ? 'Local fallback'
                  : 'Demo output'}
            </span>
          </p>

        </div>


        <div className="result-heading-actions">

          <button
            className={
              `icon-button ${
                result.favorite
                  ? 'favorite-active'
                  : ''
              }`
            }
            title="Toggle favorite"
            onClick={
              onToggleFavorite
            }
          >
            <Star
              size={17}
              fill={
                result.favorite
                  ? 'currentColor'
                  : 'none'
              }
            />
          </button>


          <button
            className="icon-button"
            title="Save project"
            onClick={
              onSave
            }
          >
            <Save size={17} />
          </button>

        </div>

      </div>


      {isFallback && (
        <div className="inline-notice">
          <span className="status-dot muted" />
          Gemini is temporarily unavailable, so
          DataMind generated this result locally.
        </div>
      )}


      <div className="result-toolbar">

        <div className="result-tabs">

          <span className="result-tab active">
            <Sparkles size={14} />
            Result
          </span>

          {hasDiagram && (
            <span className="result-tab">
              <span className="tiny-dot" />
              Visual
            </span>
          )}

        </div>


        <div className="result-actions">

          <button
            onClick={
              handleCopy
            }
          >
            <Copy size={14} />
            Copy
          </button>


          <button
            onClick={() =>
              downloadText(
                result.content ||
                  '',
                'datamind-result.md',
                'text/markdown;charset=utf-8'
              )
            }
          >
            <Download size={14} />
            Export
          </button>


          <button
            onClick={
              onRegenerate
            }
            disabled={
              busy
            }
          >
            <RefreshCw
              size={14}
            />
            Regenerate
          </button>

        </div>

      </div>


      {notice && (
        <div className="inline-notice">
          <Check size={14} />
          {notice}
        </div>
      )}


      {hasDiagram && (
        <MermaidPreview
          code={
            result.mermaid
          }
          title={
            result.title
          }
        />
      )}


      {result.cards?.length >
        0 &&
        result.format ===
          'flashcards' && (

          <div className="flashcard-grid">

            {result.cards.map(
              (
                card,
                index
              ) => (

                <button
                  className={
                    `flashcard ${
                      flipped[index]
                        ? 'flipped'
                        : ''
                    }`
                  }
                  key={
                    `${card.question}-${index}`
                  }
                  onClick={() =>
                    setFlipped(
                      (current) => ({
                        ...current,
                        [index]:
                          !current[
                            index
                          ],
                      })
                    )
                  }
                >

                  <span>
                    {flipped[index]
                      ? 'ANSWER'
                      : `CARD ${String(
                          index + 1
                        ).padStart(
                          2,
                          '0'
                        )}`}
                  </span>

                  <strong>
                    {flipped[index]
                      ? card.answer
                      : card.question}
                  </strong>

                  <small>
                    Click to{' '}
                    {flipped[index]
                      ? 'see question'
                      : 'reveal answer'}
                  </small>

                </button>

              )
            )}

          </div>
        )}


      {result.cards?.length >
        0 &&
        result.format ===
          'infographic' && (

          <div className="infographic-grid">

            {result.cards.map(
              (
                card,
                index
              ) => (

                <article
                  className="info-card"
                  key={
                    `${card.title}-${index}`
                  }
                >

                  <span className="info-card-number">
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      '0'
                    )}
                  </span>

                  <h3>
                    {card.title}
                  </h3>

                  <p>
                    {card.body}
                  </p>

                </article>

              )
            )}

          </div>
        )}


      {result.table?.headers?.length >
        0 && (

        <div className="table-wrap">

          <table className="comparison-table">

            <thead>

              <tr>

                {result.table.headers.map(
                  (
                    header
                  ) => (
                    <th
                      key={
                        header
                      }
                    >
                      {header}
                    </th>
                  )
                )}

              </tr>

            </thead>

            <tbody>

              {result.table.rows?.map(
                (
                  row,
                  index
                ) => (

                  <tr
                    key={
                      index
                    }
                  >

                    {row.map(
                      (
                        cell,
                        cellIndex
                      ) => (

                        <td
                          key={
                            cellIndex
                          }
                        >
                          {cell}
                        </td>

                      )
                    )}

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>
      )}


      <div className="content-card">

        <div className="content-card-head">

          <div>
            <FileText
              size={16}
            />

            <strong>
              Written breakdown
            </strong>
          </div>


          <button
            className="text-button"
            onClick={() => {
              setDraft(
                result.content ||
                  ''
              );

              setEditing(
                (value) =>
                  !value
              );
            }}
          >
            <Edit3
              size={14}
            />

            {editing
              ? 'Cancel edit'
              : 'Edit content'}
          </button>

        </div>


        {editing ? (

          <div className="edit-content">

            <textarea
              value={
                draft
              }
              onChange={(
                event
              ) =>
                setDraft(
                  event.target
                    .value
                )
              }
              aria-label="Edit generated content"
            />

            <div>

              <button
                className="secondary-button small"
                onClick={() =>
                  setEditing(
                    false
                  )
                }
              >
                Cancel
              </button>


              <button
                className="primary-button small"
                onClick={
                  saveEdit
                }
              >
                <Check
                  size={14}
                />
                Save changes
              </button>

            </div>

          </div>

        ) : (

          <div className="markdown-content">

            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
              ]}
            >
              {result.content ||
                'No written explanation was generated.'}
            </ReactMarkdown>

          </div>

        )}

      </div>


      {result.cards?.length >
        0 &&
        result.format !==
          'flashcards' &&
        result.format !==
          'infographic' && (

          <div className="secondary-cards">

            <h3>
              Key learning cards
            </h3>

            <div>

              {result.cards.map(
                (
                  card,
                  index
                ) => (

                  <article
                    key={
                      index
                    }
                  >

                    <strong>
                      {card.question}
                    </strong>

                    <p>
                      {card.answer}
                    </p>

                  </article>

                )
              )}

            </div>

          </div>
        )}


      <div
        className={
          `assistant-box ${
            assistantOpen
              ? 'assistant-open'
              : ''
          }`
        }
      >

        <button
          className="assistant-toggle"
          onClick={() =>
            setAssistantOpen(
              (value) =>
                !value
            )
          }
        >

          <span className="assistant-orb">
            <Sparkles
              size={16}
            />
          </span>

          <span>

            <strong>
              Ask DataMind
            </strong>

            <small>
              Refine or explore this result with AI
            </small>

          </span>

          <span className="assistant-chevron">
            {assistantOpen
              ? '−'
              : '+'}
          </span>

        </button>


        {assistantOpen && (

          <form
            className="assistant-form"
            onSubmit={
              handleAssistant
            }
          >

            <input
              value={
                assistantText
              }
              onChange={(
                event
              ) =>
                setAssistantText(
                  event.target
                    .value
                )
              }
              placeholder="e.g. Explain this in Hinglish, make it simpler..."
            />


            <button
              className="primary-button"
              disabled={
                busy ||
                !assistantText.trim()
              }
            >

              {busy ? (
                <RefreshCw
                  className="spin"
                  size={15}
                />
              ) : (
                <Send
                  size={15}
                />
              )}

              Ask

            </button>


            <div className="assistant-suggestions">

              <button
                type="button"
                onClick={() =>
                  setAssistantText(
                    'Explain this in simple Hinglish.'
                  )
                }
              >
                Explain in Hinglish
              </button>


              <button
                type="button"
                onClick={() =>
                  setAssistantText(
                    'Make this more concise without removing important facts.'
                  )
                }
              >
                Make it shorter
              </button>


              <button
                type="button"
                onClick={() =>
                  setAssistantText(
                    'Create five quiz questions from this content.'
                  )
                }
              >
                Create quiz questions
              </button>

            </div>

          </form>
        )}

      </div>

    </section>
  );
}
