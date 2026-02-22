import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyEmail } from '../api/auth';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function VerifyEmailPage() {
    const { uid, token } = useParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!uid || !token) {
            setStatus('error');
            setMessage('Neplatný odkaz. Chýbajú parametre.');
            return;
        }

        const verify = async () => {
            try {
                const data = await verifyEmail(uid, token);
                setStatus('success');
                setMessage(data.success || 'E-mail bol úspešne overený.');
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.error || 'Nepodarilo sa overiť e-mail.');
            }
        };

        verify();
    }, [uid, token]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Overenie e-mailu
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    {status === 'loading' && (
                        <div>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Overujem, prosím čakajte...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div>
                            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Úspešné overenie</h3>
                            <p className="mt-2 text-sm text-gray-600">{message}</p>
                            <div className="mt-6">
                                <Link
                                    to="/login"
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Prejsť na prihlásenie
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div>
                            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Chyba overenia</h3>
                            <p className="mt-2 text-sm text-gray-600">{message}</p>
                            <div className="mt-6">
                                <Link
                                    to="/login"
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Návrat na prihlásenie
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
