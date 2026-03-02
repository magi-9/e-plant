import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { login } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';
import { LockClosedIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [errorMsg, setErrorMsg] = useState('');

    const mutation = useMutation({
        mutationFn: () => login(email, password),
        onSuccess: (data) => {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            navigate('/products');
        },
        onError: (error: Error) => {
            console.error('Login failed', error);
            setErrorMsg('Nesprávny email alebo heslo');
        }
    });

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg('');
        mutation.mutate();
    };

    return (
        <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 flex-grow">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-slate-100">
                <div>
                    <div className="mx-auto h-12 w-12 bg-cyan-100 rounded-full flex items-center justify-center">
                        <LockClosedIcon className="h-6 w-6 text-cyan-600" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Prihláste sa do svojho účtu
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        Alebo{' '}
                        <Link to="/register" className="font-medium text-cyan-700 hover:text-cyan-600">
                            vytvorte nový účet
                        </Link>
                    </p>
                </div>
                {mutation.isPending && (
                    <div className="flex items-center justify-center gap-2 bg-cyan-50 rounded-md p-4 border border-cyan-100">
                        <ArrowPathIcon className="h-5 w-5 text-cyan-600 animate-spin" />
                        <p className="text-sm font-medium text-cyan-700">Prihlasovanie v priebehu...</p>
                    </div>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {errorMsg && (
                        <div className="rounded-md bg-red-50 p-4 border border-red-100">
                            <div className="flex">
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Nesprávny email alebo heslo</h3>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email" className="sr-only">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-t-md focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Heslo</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-b-md focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm"
                                placeholder="Heslo"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-slate-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                                Zapamätať si ma
                            </label>
                        </div>

                        <div className="text-sm">
                            <Link to="/forgot-password" className="font-medium text-cyan-700 hover:text-cyan-600">
                                Zabudli ste heslo?
                            </Link>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="group relative w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {mutation.isPending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                            {mutation.isPending ? 'Prihlasovanie...' : 'Prihlásiť sa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
