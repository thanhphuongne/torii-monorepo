import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { apiClient, extractErrorMessage } from '@/lib/api/api-client.ts';
import type { UserResponseDTO, UserLoginDTO } from '@workspace/schemas';
import type { AxiosError } from 'axios';

// Extended User type including permissions and profile fields
export interface User extends UserResponseDTO {
    permissions: string[];
    avatarUrl?: string | null;
}

export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    user: User | null;
}

const initialState: AuthState = {
    isAuthenticated: false,
    isLoading: true, // Start as true while checking auth
    error: null,
    user: null,
};

// Async Thunks
export const login = createAsyncThunk(
    'auth/adminLogin',
    async (credentials: UserLoginDTO, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/api/auth/admin/login', credentials);

            // Check if response is successful
            if (response.data.success && response.data.data?.user) {
                return response.data.data.user;
            }

            // If response indicates 2FA required
            if (response.data.data?.requiresTwoFactor) {
                return rejectWithValue({
                    requiresTwoFactor: true,
                    twoFactorMethod: response.data.data.twoFactorMethod,
                    tempToken: response.data.data.tempToken,
                    message: response.data.message || 'Two-factor authentication required',
                });
            }

            // Unexpected response structure
            return rejectWithValue('Invalid response from server');
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            const errorMessage = extractErrorMessage(axiosError);
            return rejectWithValue(errorMessage);
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async () => {
        try {
            await apiClient.post('/api/auth/logout');
            return null;
        } catch (error: unknown) {
            // Even if logout fails, we should clear local state
            // But log the error for debugging
            const axiosError = error as AxiosError;
            const errorMessage = extractErrorMessage(axiosError);
            console.warn('Logout error:', errorMessage);
            // Don't reject - logout should succeed even if server call fails
            return null;
        }
    }
);

export const checkAuth = createAsyncThunk(
    'auth/check',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/api/auth/me');

            if (response.data.success && response.data.data?.user) {
                return response.data.data.user;
            }

            return rejectWithValue('Not authenticated');
        } catch {
            // Don't show error for auth check - it's expected to fail if not logged in
            return rejectWithValue('Not authenticated');
        }
    }
);

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuthenticated: (state, action: PayloadAction<{ isAuthenticated: boolean; user?: User }>) => {
            state.isAuthenticated = action.payload.isAuthenticated;
            state.user = action.payload.user || null;
            state.error = null;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
        },
        setPermissions: (state, action: PayloadAction<string[]>) => {
            if (state.user) {
                state.user.permissions = action.payload;
            }
        },
        clearUser: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        // Login
        builder.addCase(login.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(login.fulfilled, (state, action) => {
            state.isLoading = false;
            state.isAuthenticated = true;
            state.user = action.payload as User;
            state.error = null;
        });
        builder.addCase(login.rejected, (state, action) => {
            state.isLoading = false;
            // Handle 2FA case
            if (action.payload && typeof action.payload === 'object' && 'requiresTwoFactor' in action.payload) {
                // Don't set error for 2FA - it's not an error, just a different flow
                state.error = null;
            } else {
                state.error = action.payload as string || 'Login failed';
            }
        });

        // Logout
        builder.addCase(logout.fulfilled, (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
        });
        builder.addCase(logout.rejected, (state) => {
            // Even if logout fails, clear local state
            state.user = null;
            state.isAuthenticated = false;
        });

        // Check Auth
        builder.addCase(checkAuth.pending, () => {
            // Don't set loading here - it's a background check
        });
        builder.addCase(checkAuth.fulfilled, (state, action) => {
            state.isLoading = false;
            state.isAuthenticated = true;
            state.user = action.payload as User;
            state.error = null;
        });
        builder.addCase(checkAuth.rejected, (state) => {
            state.isLoading = false;
            state.isAuthenticated = false;
            state.user = null;
            // Don't set error for auth check failures
        });
    }
});

export const { setAuthenticated, setLoading, setError, setUser, setPermissions, clearUser } = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectUser = (state: RootState) => state.auth.user;
export const selectRole = (state: RootState) => state.auth.user?.role;
export const selectPermissions = (state: RootState) => state.auth.user?.permissions || [];

export default authSlice.reducer;
