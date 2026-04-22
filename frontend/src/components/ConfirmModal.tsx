import { useState, useEffect } from 'react';

interface ConfirmModalProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isPending?: boolean;
    requireTyped?: string;
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Potvrdiť', onConfirm, onCancel, isPending, requireTyped }: ConfirmModalProps) {
    const [typed, setTyped] = useState('');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!open) setTyped('');
    }, [open]);

    if (!open) return null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    const canConfirm = !requireTyped || typed.trim().toUpperCase() === requireTyped.toUpperCase();

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" onKeyDown={handleKeyDown}>
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onCancel}></div>
                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm z-10 p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
                    <h3 id="confirm-title" className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                    <p id="confirm-message" className="text-sm text-gray-600 mb-4">{message}</p>
                    {requireTyped && (
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Pre potvrdenie zadajte číslo objednávky: <span className="font-mono font-bold">{requireTyped}</span>
                            </label>
                            <input
                                type="text"
                                value={typed}
                                onChange={e => setTyped(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                                autoFocus
                            />
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition"
                        >
                            Zrušiť
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isPending || !canConfirm}
                            className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition disabled:opacity-50"
                        >
                            {isPending ? 'Odstraňujem...' : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
