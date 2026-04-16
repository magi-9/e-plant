import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { sendProductInquiry } from '../api/products';
import { getMe } from '../api/auth';

interface RequestProductModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    productId: number;
    productName: string;
    productReference?: string;
}

const buildDefaultInquiryMessage = (productName: string, productReference?: string, customerName?: string): string => {
    const referenceLine = productReference ? ` (REF: ${productReference})` : '';
    const signature = customerName ? customerName : 'Meno zákazníka';

    return [
        'Dobrý deň,',
        `mal by som záujem o tento produkt: ${productName}${referenceLine}.`,
        'Prosím o informáciu o dostupnosti a predpokladanom termíne dodania.',
        '',
        'Ďakujem.',
        'S pozdravom,',
        signature,
    ].join('\n');
};

export default function RequestProductModal({
    open,
    onClose,
    onSuccess,
    productId,
    productName,
    productReference,
}: RequestProductModalProps) {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [isDefaultMessage, setIsDefaultMessage] = useState(false);

    useEffect(() => {
        if (open) {
            const initialMessage = buildDefaultInquiryMessage(productName, productReference);
            setMessage(initialMessage);
            setIsDefaultMessage(true);

            // Fetch user profile to get customer name
            const fetchUserProfile = async () => {
                try {
                    const data = await getMe();
                    const fullName = `${data.title || ''} ${data.first_name || ''} ${data.last_name || ''}`.trim();
                    setCustomerName(fullName || data.email);
                } catch {
                    // Fallback: just use empty, will be filled from request context
                }
            };
            fetchUserProfile();
        }
    }, [open, productName, productReference]);

    useEffect(() => {
        if (open && isDefaultMessage) {
            setMessage(buildDefaultInquiryMessage(productName, productReference, customerName));
        }
    }, [open, isDefaultMessage, customerName, productName, productReference]);

    const handleClose = () => {
        setMessage('');
        setIsDefaultMessage(false);
        onClose();
    };

    const handleSubmit = async () => {
        if (!message.trim()) {
            toast.error('Prosím napíšte správu.');
            return;
        }

        if (message.trim().length < 10) {
            toast.error('Správa musí obsahovať aspoň 10 znakov.');
            return;
        }

        if (message.length > 2000) {
            toast.error('Správa je príliš dlhá (max 2000 znakov).');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await sendProductInquiry(productId, message);
            if (result.success) {
                toast.success('Dotaz bol úspešne odoslaný na sklad.');
                handleClose();
                onSuccess?.();
            } else {
                toast.error('Chyba pri odoslaní dotazu.');
            }
        } catch {
            toast.error('Chyba pri odoslaní dotazu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
                    >
                        <Dialog.Panel className="bg-white rounded-lg shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Požiadať o produkt</h2>
                    <button
                        onClick={handleClose}
                        aria-label="Zavrieť"
                        className="text-slate-400 hover:text-slate-600 transition"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Produkt
                        </label>
                        <div className="px-3 py-2 bg-slate-100 rounded text-slate-700 text-sm flex items-center justify-between gap-3">
                            <span className="font-medium">{productName}</span>
                            {productReference && (
                                <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-mono text-slate-700">
                                    REF: {productReference}
                                </span>
                            )}
                        </div>
                    </div>

                    {customerName && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Vaše meno
                            </label>
                            <div className="px-3 py-2 bg-slate-100 rounded text-slate-700 text-sm">
                                {customerName}
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                            Správa *
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                setIsDefaultMessage(false);
                            }}
                            maxLength={2000}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                            rows={7}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            {message.length}/2000 znakov
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-200">
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-50"
                    >
                        Zrušiť
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !message.trim()}
                        className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition disabled:opacity-50"
                    >
                        {isSubmitting ? 'Odosielam...' : 'Odoslať'}
                    </button>
                </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
