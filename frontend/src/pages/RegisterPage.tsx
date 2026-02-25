import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { register } from '../api/auth';
import { Link } from 'react-router-dom';
import { UserPlusIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const emailValid = EMAIL_REGEX.test(formData.email);
    const hasMinLength = formData.password.length >= 8;
    const hasNumber = /\d/.test(formData.password);
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';
    const canSubmit = emailValid && hasMinLength && hasNumber && passwordsMatch;

    const mutation = useMutation({
        mutationFn: () => register({
            email: formData.email,
            password: formData.password
        }),
        onSuccess: () => {
            setRegistrationSuccess(true);
        },
        onError: (error: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = error as any;
            console.error('Registration failed', err);
            setErrorMsg(err.response?.data?.email?.[0] || 'Registrácia zlyhala. Skúste to prosím znova.');
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg('');
        setSubmitAttempted(true);
        setEmailTouched(true);
        if (!canSubmit) return;
        mutation.mutate();
    };

    return (
        <div className="min-h-full flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 flex-grow">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-10">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="mx-auto h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <UserPlusIcon className="h-7 w-7 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">Vytvorte si účet</h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Už máte účet?{' '}
                        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                            Prihláste sa
                        </Link>
                    </p>
                </div>

                {registrationSuccess ? (
                    <div className="text-center bg-gray-50 p-8 rounded-xl border border-gray-100">
                        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-green-100 mb-4">
                            <CheckCircleIcon className="h-7 w-7 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Skontrolujte si e-mail</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Na vami zadanú adresu sme odoslali overovací odkaz. Pre aktiváciu účtu a možnosť nákupu prosím kliknite na odkaz v e-maile.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex justify-center py-2.5 px-6 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                            Prejsť na prihlásenie
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate className="space-y-6">

                        {errorMsg && (
                            <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
                                <XCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{errorMsg}</p>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Emailová adresa <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={() => setEmailTouched(true)}
                                    placeholder="jan@priklad.sk"
                                    className={`block w-full rounded-lg border px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 outline-none transition ${
                                        emailTouched && formData.email
                                            ? emailValid
                                                ? 'border-green-400 focus:border-green-500 focus:ring-green-400'
                                                : 'border-red-400 focus:border-red-500 focus:ring-red-400'
                                            : emailTouched && !formData.email
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-400'
                                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                    }`}
                                />
                                {emailTouched && formData.email && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {emailValid
                                            ? <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                            : <XCircleIcon className="h-5 w-5 text-red-400" />
                                        }
                                    </span>
                                )}
                            </div>
                            {emailTouched && !formData.email && (
                                <p className="mt-1 text-xs text-red-600" role="alert">Zadajte emailovú adresu.</p>
                            )}
                            {emailTouched && formData.email && !emailValid && (
                                <p className="mt-1 text-xs text-red-600">Zadajte platnú emailovú adresu.</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Heslo <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={handleChange}
                                onFocus={() => setPasswordTouched(true)}
                                placeholder="Minimálne 8 znakov"
                                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                            />
                            {(passwordTouched || formData.password) && (
                                <ul className="mt-3 space-y-1 pl-1">
                                    <Requirement met={hasMinLength} label="Aspoň 8 znakov" />
                                    <Requirement met={hasNumber} label="Aspoň jedna číslica" />
                                </ul>
                            )}
                        </div>

                        {/* Confirm password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Potvrďte heslo <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Zopakujte heslo"
                                    className={`block w-full rounded-lg border px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 outline-none transition ${
                                        formData.confirmPassword
                                            ? passwordsMatch
                                                ? 'border-green-400 focus:border-green-500 focus:ring-green-400'
                                                : 'border-red-400 focus:border-red-500 focus:ring-red-400'
                                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                    }`}
                                />
                                {formData.confirmPassword && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {passwordsMatch
                                            ? <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                            : <XCircleIcon className="h-5 w-5 text-red-400" />
                                        }
                                    </span>
                                )}
                            </div>
                            {formData.confirmPassword && !passwordsMatch && (
                                <p className="mt-1 text-xs text-red-600">Heslá sa nezhodujú.</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={mutation.isPending || !canSubmit}
                            className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {mutation.isPending ? 'Vytváranie účtu…' : 'Vytvoriť účet'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
