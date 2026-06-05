import { useAppSelector } from '@/hooks/hooks';
import { selectUser, selectIsAuthenticated } from '@/store/slices/auth-slice';

export function useAuth() {
    const user = useAppSelector(selectUser);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    return {
        user,
        isAuthenticated,
    };
}
