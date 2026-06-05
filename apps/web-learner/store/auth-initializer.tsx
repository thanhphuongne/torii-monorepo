'use client';

import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/hooks/hooks';
import { checkAuth, resetAuth } from '@/store/slices/authSlice';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            dispatch(checkAuth());
            initialized.current = true;
        }

        // Listen for auth expired event from api-client
        const handleAuthExpired = () => {
            dispatch(resetAuth());
        };

        window.addEventListener('auth:expired', handleAuthExpired);
        return () => window.removeEventListener('auth:expired', handleAuthExpired);
    }, [dispatch]);

    return <>{children}</>;
}
