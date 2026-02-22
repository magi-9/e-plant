import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { register } from '../api/auth';
import { Link } from 'react-router-dom';
import { UserPlusIcon } from '@heroicons/react/24/solid';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errorMsg, setErrorMsg] = useState('');
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const mutation = useMutation({
        mutationFn: () => register({
            username: formData.username,
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
            setErrorMsg(err.response?.data?.username?.[0] || 'Registrácia zlyhala. Skúste to prosím znova.');
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg('');

        if (formData.password !== formData.confirmPassword) {
            setErrorMsg('Heslá sa nezhodujú');
            return;
        }

        mutation.mutate();
    };

    return (
        <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex-grow">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserPlusIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Vytvorte si účet
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Už máte účet?{' '}
                        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                            Prihláste sa
                        </Link>
                    </p>
                </div>
                {registrationSuccess ? (
                    <div className="text-center bg-gray-50 p-6 rounded-lg border border-gray-100 mt-8">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Skontrolujte si e-mail</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Na vami zadanú adresu sme odoslali overovací odkaz. Pre aktiváciu účtu a možnosť nákupu prosím kliknite na odkaz v e-maile.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Prejsť na prihlásenie
                        </Link>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {errorMsg && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">{errorMsg}</h3>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="username" className="sr-only">Používateľské meno</label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Používateľské meno"
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="sr-only">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Emailová adresa"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">Heslo</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Heslo"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="sr-only">Potvrdenie hesla</label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Potvrďte heslo"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                                {mutation.isPending ? 'Vytváranie účtu...' : 'Vytvoriť účet'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
