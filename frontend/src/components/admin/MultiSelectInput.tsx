import { useState, useRef, useEffect, useMemo } from 'react';

const CYAN = '#2196f3';
const CYAN_LITE = '#eaf4fe';
const BORDER = '#e2e8f0';
const TEXT = '#0f172a';

function chipTone(color?: 'cat' | 'compat') {
    if (color === 'cat')    return { bg: CYAN_LITE, fg: '#0e7490', border: '#a5f3fc' };
    if (color === 'compat') return { bg: '#ecfdf5',  fg: '#047857', border: '#a7f3d0' };
    return { bg: '#f1f5f9', fg: TEXT, border: BORDER };
}

interface Props {
    values: string[];
    options: string[];
    onChange: (v: string[]) => void;
    placeholder?: string;
    color?: 'cat' | 'compat';
    allowCreate?: boolean;
}

export default function MultiSelectInput({ values, options, onChange, placeholder, color, allowCreate }: Props) {
    const [open, setOpen]   = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapRef  = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return [...new Set(options)]
            .filter(o => !values.includes(o) && (q === '' || o.toLowerCase().includes(q)));
    }, [options, values, query]);

    const canCreate = !!(allowCreate && query.trim() && !options.includes(query.trim()) && !values.includes(query.trim()));

    function add(v: string) {
        if (!values.includes(v)) onChange([...values, v]);
        setQuery('');
        inputRef.current?.focus();
    }
    function remove(v: string) { onChange(values.filter(x => x !== v)); }

    const tone = chipTone(color);

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <div
                onClick={() => { setOpen(true); inputRef.current?.focus(); }}
                style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
                    minHeight: 44, padding: '6px 10px',
                    borderRadius: 10, border: `1.5px solid ${open ? CYAN : BORDER}`,
                    background: '#fff', cursor: 'text',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: open ? '0 0 0 4px rgba(33,150,243,0.10)' : 'none',
                }}
            >
                {values.map(v => (
                    <span key={v} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 8px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                        lineHeight: 1.3, whiteSpace: 'nowrap',
                        background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
                    }}>
                        {v}
                        <button
                            onClick={e => { e.stopPropagation(); remove(v); }}
                            style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: tone.fg, opacity: 0.6, padding: 0, fontSize: 15, lineHeight: 1 }}
                        >×</button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && canCreate)        { e.preventDefault(); add(query.trim()); }
                        else if (e.key === 'Enter' && filtered[0]) { e.preventDefault(); add(filtered[0]); }
                        else if (e.key === 'Backspace' && !query && values.length) remove(values[values.length - 1]);
                    }}
                    placeholder={values.length === 0 ? placeholder : ''}
                    style={{
                        flex: 1, minWidth: 100, padding: '4px',
                        border: 'none', outline: 'none', background: 'transparent',
                        fontSize: 14, color: TEXT,
                    }}
                />
            </div>

            {open && (filtered.length > 0 || canCreate) && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10,
                    boxShadow: '0 12px 32px rgba(15,23,42,0.10)', zIndex: 30,
                    maxHeight: 240, overflow: 'auto', padding: 4,
                }}>
                    {filtered.map(o => (
                        <button key={o} onClick={() => add(o)} style={{
                            display: 'flex', alignItems: 'center', width: '100%', padding: '8px 10px',
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            borderRadius: 7, textAlign: 'left', fontSize: 13.5, color: TEXT,
                        }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = CYAN_LITE}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                            {o}
                        </button>
                    ))}
                    {canCreate && (
                        <button onClick={() => add(query.trim())} style={{
                            display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '8px 10px',
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            borderRadius: 7, textAlign: 'left', fontSize: 13.5, color: CYAN, fontWeight: 600,
                        }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = CYAN_LITE}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                            + Vytvoriť „{query.trim()}"
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
