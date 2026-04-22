import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'cookie_consent';
const CONSENT_EVENT = 'cookie-consent-changed';

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (localStorage.getItem(STORAGE_KEY) !== 'accepted') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVisible(true);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(STORAGE_KEY, 'accepted');
        window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: 'accepted' }));
        setVisible(false);
    };

    const decline = () => {
        localStorage.setItem(STORAGE_KEY, 'declined');
        window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: 'declined' }));
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <p className="text-sm text-gray-700 flex-1">
                    Táto stránka používa cookies na zabezpečenie funkčnosti a zlepšenie zážitku.
                    Viac informácií nájdete v{' '}
                    <Link to="/privacy" className="underline text-cyan-700 hover:text-cyan-900">
                        Zásadách ochrany súkromia
                    </Link>
                    .
                </p>
                <div className="flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={decline}
                        className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Odmietnuť
                    </button>
                    <button
                        type="button"
                        onClick={accept}
                        className="px-4 py-2 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                    >
                        Prijať
                    </button>
                </div>
            </div>
        </div>
    );
}
