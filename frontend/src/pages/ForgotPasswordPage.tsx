import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { requestPasswordReset } from '../api/auth';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const mutation = useMutation({
        mutationFn: () => requestPasswordReset(email),
        onSuccess: () => {
            setSubmitted(true);
        },
        onError: (error: unknown) => {
            if (isAxiosError(error)) {
                if (error.response?.status === 429) {
                    setErrorMsg(error.response.data?.error || 'Príliš veľa pokusov. Skúste neskôr.');
                } else {
                    setErrorMsg(error.response?.data?.error || 'Nastala chyba. Skúste to znova.');
                }
            } else {
                setErrorMsg('Nastala chyba. Skúste to znova.');
            }
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg('');
        mutation.mutate();
    };

    return (
        <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex-grow">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Zabudnuté heslo
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Zadajte vašu e-mailovú adresu a my vám pošleme odkaz na obnovenie hesla.
                    </p>
                </div>

                {submitted ? (
                    <div className="rounded-md bg-green-50 p-6 text-center">
                        <p className="text-sm font-medium text-green-800">
                            Ak účet s touto adresou existuje, odoslali sme odkaz na obnovenie hesla.
                        </p>
                        <p className="mt-2 text-xs text-green-700">
                            Skontrolujte si priečinok so spamom, ak e-mail nevidíte do pár minút.
                        </p>
                        <Link
                            to="/login"
                            className="mt-4 inline-block font-medium text-blue-600 hover:text-blue-500 text-sm"
                        >
                            Späť na prihlásenie
                        </Link>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {errorMsg && (
                            <div className="rounded-md bg-red-50 p-4">
                                <p className="text-sm font-medium text-red-800">{errorMsg}</p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="sr-only">E-mailová adresa</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="E-mailová adresa"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50"
                            >
                                {mutation.isPending ? 'Odosielam...' : 'Odoslať odkaz na obnovenie'}
                            </button>
                        </div>

                        <div className="text-center">
                            <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                Späť na prihlásenie
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
