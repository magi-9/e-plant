import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useParams, Link } from 'react-router-dom';
import { LockClosedIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { confirmPasswordReset } from '../api/auth';

function Requirement({ met, label }: { met: boolean; label: string }) {
    return (
        <li className="flex items-center gap-2 text-sm">
            {met ? (
                <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
                <XCircleIcon className="h-4 w-4 text-gray-300 shrink-0" />
            )}
            <span className={met ? 'text-green-700' : 'text-gray-500'}>{label}</span>
        </li>
    );
}

export default function ResetPasswordPage() {
    const { uid, token } = useParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [success, setSuccess] = useState(false);

    const hasMinLength = newPassword.length >= 8;
    const hasNumber = !/^\d+$/.test(newPassword);
    const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';
    const canSubmit = hasMinLength && hasNumber && passwordsMatch;

    const mutation = useMutation({
        mutationFn: () => confirmPasswordReset(uid!, token!, newPassword),
        onSuccess: () => {
            setSuccess(true);
        },
        onError: (error: unknown) => {
            if (isAxiosError(error)) {
                setErrorMsg(error.response?.data?.error || 'Nastala chyba. Skúste to znova.');
            } else {
                setErrorMsg('Nastala chyba. Skúste to znova.');
            }
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg('');

        if (!uid || !token) {
            setErrorMsg('Neplatný odkaz. Chýbajú parametre.');
            return;
        }
        if (!canSubmit) {
            setErrorMsg('Prosím, vyplňte všetky požiadavky na heslo.');
            return;
        }

        mutation.mutate();
    };

    if (!uid || !token) {
        return (
            <div className="min-h-full flex items-center justify-center py-12 px-4 bg-gray-50 flex-grow">
                <div className="max-w-md w-full bg-white p-10 rounded-xl shadow-lg text-center">
                    <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Neplatný odkaz</h3>
                    <p className="mt-2 text-sm text-gray-600">Chýbajú parametre odkazu na obnovenie hesla.</p>
                    <Link to="/forgot-password" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500">
                        Požiadať o nový odkaz
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex-grow">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <LockClosedIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Nastavenie nového hesla
                    </h2>
                </div>

                {success ? (
                    <div className="text-center">
                        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Heslo bolo zmenené</h3>
                        <p className="mt-2 text-sm text-gray-600">Teraz sa môžete prihlásiť s novým heslom.</p>
                        <Link
                            to="/login"
                            className="mt-6 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Prihlásiť sa
                        </Link>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {errorMsg && (
                            <div className="rounded-md bg-red-50 p-4">
                                <p className="text-sm font-medium text-red-800">{errorMsg}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                                    Nové heslo
                                </label>
                                <input
                                    id="new_password"
                                    name="new_password"
                                    type="password"
                                    required
                                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Minimálne 8 znakov s číslicou"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    onBlur={() => setPasswordTouched(true)}
                                />
                                {(passwordTouched || newPassword) && (
                                    <ul className="mt-3 space-y-1 pl-1">
                                        <Requirement met={hasMinLength} label="Aspoň 8 znakov" />
                                        <Requirement met={hasNumber} label="Nesmie obsahovať iba číslice" />
                                    </ul>
                                )}
                            </div>
                            <div>
                                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                                    Potvrďte nové heslo
                                </label>
                                <input
                                    id="confirm_password"
                                    name="confirm_password"
                                    type="password"
                                    required
                                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Zopakujte heslo"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                {confirmPassword && (
                                    <ul className="mt-3 space-y-1 pl-1">
                                        <Requirement met={passwordsMatch} label="Heslá sa zhodujú" />
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={!canSubmit || mutation.isPending}
                                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {mutation.isPending ? 'Ukladám...' : 'Nastaviť nové heslo'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
