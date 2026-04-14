interface ConfirmModalProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isPending?: boolean;
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Potvrdiť', onConfirm, onCancel, isPending }: ConfirmModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onCancel}></div>
                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm z-10 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-600 mb-6">{message}</p>
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
                            disabled={isPending}
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
