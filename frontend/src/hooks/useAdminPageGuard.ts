import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { isAdmin } from '../api/auth';

export function useAdminPageGuard(redirectTo = '/products'): boolean {
    const navigate = useNavigate();
    const allowed = isAdmin();
    const warnedRef = useRef(false);

    useEffect(() => {
        if (!allowed && !warnedRef.current) {
            warnedRef.current = true;
            toast.error('Do administrácie majú prístup iba administrátori.');
            navigate(redirectTo, { replace: true });
        }
    }, [allowed, navigate, redirectTo]);

    return allowed;
}
