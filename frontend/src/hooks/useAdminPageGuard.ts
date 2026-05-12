import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { isAdmin } from '../api/auth';
import { authService } from '../api/authService';

export function useAdminPageGuard(redirectTo = '/products'): boolean {
    const navigate = useNavigate();
    const location = useLocation();
    const allowed = isAdmin();
    const warnedRef = useRef(false);
    const loginRedirectInProgress = authService.isLoginRedirectInProgress();

    useEffect(() => {
        if (
            allowed ||
            warnedRef.current ||
            loginRedirectInProgress ||
            location.pathname === '/login' ||
            location.pathname === redirectTo
        ) {
            return;
        }

        warnedRef.current = true;
        toast.error('Do administrácie majú prístup iba administrátori.');
        navigate(redirectTo, { replace: true });
    }, [allowed, loginRedirectInProgress, location.pathname, navigate, redirectTo]);

    return allowed;
}
