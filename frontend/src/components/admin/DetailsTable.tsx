import { useState, useRef } from 'react';
import { type DetailRow, DETAIL_SUGGESTIONS, nextDetailId } from './detailTypes';

const CYAN = '#0891b2';
const CYAN_LITE = '#e0f7fa';
const BORDER = '#e2e8f0';
const TEXT = '#0f172a';
const MUTED = '#94a3b8';
const SUB = '#64748b';

export type { DetailRow };

interface KeyInputProps {
    value: string;
    onChange: (v: string) => void;
    suggestions: string[];
}

function KeyInput({ value, onChange, suggestions }: KeyInputProps) {
    const [focus, setFocus] = useState(false);
    const [openSugg, setOpenSugg] = useState(false);
    const filtered = suggestions
        .filter(s => s.toLowerCase().includes((value || '').toLowerCase()))
        .slice(0, 5);

    return (
        <div style={{ position: 'relative' }}>
            <input
                value={value}
                onChange={e => { onChange(e.target.value); setOpenSugg(true); }}
                onFocus={() => { setFocus(true); setOpenSugg(true); }}
                onBlur={() => { setFocus(false); setTimeout(() => setOpenSugg(false), 150); }}
                placeholder="napr. GH (mm)"
                style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: `1.5px solid ${focus ? CYAN : BORDER}`,
                    background: '#fff', fontSize: 13.5, fontFamily: 'Inter',
                    fontWeight: 600, color: TEXT, outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: focus ? '0 0 0 4px rgba(6,182,212,0.10)' : 'none',
                    boxSizing: 'border-box',
                }}
            />
            {focus && openSugg && filtered.length > 0 && value !== filtered[0] && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(15,23,42,0.10)', zIndex: 5, padding: 4,
                }}>
                    {filtered.map(s => (
                        <button
                            key={s}
                            onMouseDown={e => { e.preventDefault(); onChange(s); setOpenSugg(false); }}
                            style={{
                                display: 'block', width: '100%', padding: '7px 10px', borderRadius: 6,
                                border: 'none', background: 'transparent', textAlign: 'left',
                                fontSize: 13, color: TEXT, fontFamily: 'Inter', fontWeight: 600, cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = CYAN_LITE}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

interface Props {
    rows: DetailRow[];
    onChange: (rows: DetailRow[]) => void;
    suggestions?: string[];
}

export default function DetailsTable({ rows, onChange, suggestions = [...DETAIL_SUGGESTIONS] }: Props) {
    const [dragId, setDragId] = useState<number | null>(null);
    const dragOverId = useRef<number | null>(null);

    function update(id: number, field: 'k' | 'v', val: string) {
        onChange(rows.map(r => r.id === id ? { ...r, [field]: val } : r));
    }
    function add(seed = '') {
        onChange([...rows, { id: nextDetailId(), k: seed, v: '' }]);
    }
    function remove(id: number) {
        onChange(rows.filter(r => r.id !== id));
    }
    function reorder(fromId: number, toId: number) {
        if (fromId === toId) return;
        const fromIdx = rows.findIndex(r => r.id === fromId);
        const toIdx = rows.findIndex(r => r.id === toId);
        const next = [...rows];
        const [m] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, m);
        onChange(next);
    }

    const usedKeys = new Set(rows.map(r => r.k));
    const unusedSuggestions = suggestions.filter(s => !usedKeys.has(s));

    return (
        <div>
            {rows.length > 0 && (
                <div style={{
                    display: 'grid', gridTemplateColumns: '24px 1fr 1.4fr 36px', gap: 0,
                    fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase',
                    letterSpacing: '0.08em', padding: '0 0 8px 0',
                }}>
                    <span />
                    <span style={{ paddingLeft: 4 }}>Parameter</span>
                    <span style={{ paddingLeft: 14 }}>Hodnota</span>
                    <span />
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {rows.map(r => (
                    <div
                        key={r.id}
                        draggable
                        onDragStart={() => setDragId(r.id)}
                        onDragOver={e => { e.preventDefault(); dragOverId.current = r.id; }}
                        onDrop={e => {
                            e.preventDefault();
                            if (dragId !== null) reorder(dragId, r.id);
                            setDragId(null);
                        }}
                        onDragEnd={() => setDragId(null)}
                        style={{
                            display: 'grid', gridTemplateColumns: '24px 1fr 1.4fr 36px',
                            alignItems: 'center', gap: 0,
                            borderRadius: 8, padding: '2px 0',
                            opacity: dragId === r.id ? 0.4 : 1,
                            transition: 'opacity 0.15s',
                        }}
                    >
                        <span style={{
                            color: MUTED, cursor: 'grab', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        }}>⠿</span>
                        <KeyInput value={r.k} onChange={v => update(r.id, 'k', v)} suggestions={unusedSuggestions} />
                        <div style={{ paddingLeft: 10 }}>
                            <input
                                value={r.v}
                                onChange={e => update(r.id, 'v', e.target.value)}
                                placeholder="hodnota"
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: 10,
                                    border: `1.5px solid ${BORDER}`, background: '#fff',
                                    fontSize: 13.5, fontFamily: 'Inter', color: TEXT, outline: 'none',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={e => {
                                    e.currentTarget.style.borderColor = CYAN;
                                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(6,182,212,0.10)';
                                }}
                                onBlur={e => {
                                    e.currentTarget.style.borderColor = BORDER;
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                        <button
                            onClick={() => remove(r.id)}
                            title="Odstrániť"
                            style={{
                                width: 32, height: 32, display: 'inline-flex', alignItems: 'center',
                                justifyContent: 'center', border: 'none', background: 'transparent',
                                cursor: 'pointer', borderRadius: 7, color: MUTED, fontSize: 16,
                                transition: 'color 0.12s, background 0.12s',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.color = '#dc2626';
                                (e.currentTarget as HTMLElement).style.background = '#fee2e2';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.color = MUTED;
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                        >×</button>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: 14, paddingTop: 14,
                borderTop: rows.length > 0 ? `1px dashed ${BORDER}` : 'none',
            }}>
                {unusedSuggestions.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                        <div style={{
                            fontSize: 10.5, fontWeight: 700, color: MUTED,
                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
                        }}>
                            Rýchle pridanie
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {unusedSuggestions.map(s => (
                                <button
                                    key={s}
                                    onClick={() => add(s)}
                                    style={{
                                        padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                                        border: `1px dashed ${BORDER}`, background: '#fff',
                                        color: SUB, cursor: 'pointer', fontFamily: 'Inter',
                                        transition: 'all 0.12s',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = CYAN;
                                        (e.currentTarget as HTMLElement).style.background = CYAN_LITE;
                                        (e.currentTarget as HTMLElement).style.color = CYAN;
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = BORDER;
                                        (e.currentTarget as HTMLElement).style.background = '#fff';
                                        (e.currentTarget as HTMLElement).style.color = SUB;
                                    }}
                                >
                                    + {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <button
                    onClick={() => add()}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                        border: `1.5px solid ${CYAN}`, background: 'transparent',
                        color: CYAN, cursor: 'pointer', fontFamily: 'Inter',
                        transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = CYAN_LITE}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                    + Pridať vlastný parameter
                </button>
            </div>
        </div>
    );
}
