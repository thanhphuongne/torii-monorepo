import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient, extractErrorMessage } from '@/lib/api/api-client';
import type { UserResponseDTO, UserLoginDTO, UserRegistrationDTO } from '@workspace/schemas';
import type { AxiosError } from 'axios';

// Define the auth state
export interface AuthState {
    user: UserResponseDTO | null;
    isAuthenticated: boolean;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// Initial state
const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    status: 'idle',
    error: null,
};

// Async Thunks

export const login = createAsyncThunk(
    'auth/login',
    async (credentials: UserLoginDTO, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/api/auth/login', credentials);

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

export const register = createAsyncThunk(
    'auth/register',
    async (userData: UserRegistrationDTO, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/api/auth/register', userData);

            // Check if response is successful
            if (response.data.success && response.data.data?.user) {
                return response.data.data.user;
            }

            // If response has a message, use it
            if (response.data.message) {
                return rejectWithValue(response.data.message);
            }

            return rejectWithValue('Registration failed');
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            const errorMessage = extractErrorMessage(axiosError);
            return rejectWithValue(errorMessage);
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await apiClient.post('/api/auth/logout');
            return;
        } catch (error: unknown) {
            // Even if logout fails, we should clear local state
            // But log the error for debugging
            const axiosError = error as AxiosError;
            const errorMessage = extractErrorMessage(axiosError);
            console.warn('Logout error:', errorMessage);
            // Don't reject - logout should succeed even if server call fails
            return;
        }
    }
);

export const checkAuth = createAsyncThunk(
    'auth/checkAuth',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/api/auth/me');

            if (response.data.success && response.data.data?.user) {
                return response.data.data.user;
            }

            return rejectWithValue('Not authenticated');
        } catch (error: unknown) {
            // Don't show error for auth check - it's expected to fail if not logged in
            return rejectWithValue('Not authenticated');
        }
    }
);

export const verifyEmail = createAsyncThunk(
    'auth/verifyEmail',
    async ({ email, otp }: { email: string; otp: string }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/api/auth/verify-email', { email, otp });

            if (response.data.success) {
                return response.data;
            }

            return rejectWithValue(response.data.message || 'Verification failed');
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            const errorMessage = extractErrorMessage(axiosError);
            return rejectWithValue(errorMessage);
        }
    }
);

export const fetchProfile = createAsyncThunk(
    'auth/fetchProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/api/auth/me');

            if (response.data.success && response.data.data?.user) {
                return response.data.data.user;
            }

            return rejectWithValue('Failed to fetch profile');
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            const errorMessage = extractErrorMessage(axiosError);
            return rejectWithValue(errorMessage);
        }
    }
);

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        resetAuth: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.status = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Login
        builder
            .addCase(login.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.isAuthenticated = true;
                state.user = action.payload;
                state.error = null;
            })
            .addCase(login.rejected, (state, action) => {
                state.status = 'failed';
                // Handle 2FA case
                if (action.payload && typeof action.payload === 'object' && 'requiresTwoFactor' in action.payload) {
                    // Don't set error for 2FA - it's not an error, just a different flow
                    state.error = null;
                } else {
                    state.error = action.payload as string || 'Login failed';
                }
            });

        // Register
        builder
            .addCase(register.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(register.fulfilled, (state) => {
                state.status = 'succeeded';
                // Do NOT set isAuthenticated = true here.
                // The user must verify their email first.
                state.error = null;
            })
            .addCase(register.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string || 'Registration failed';
            });

        // Logout
        builder
            .addCase(logout.fulfilled, (state) => {
                state.isAuthenticated = false;
                state.user = null;
                state.status = 'idle';
                state.error = null;
            })
            .addCase(logout.rejected, (state) => {
                // Even if logout fails, clear local state
                state.isAuthenticated = false;
                state.user = null;
                state.status = 'idle';
            });

        // Check Auth
        builder
            .addCase(checkAuth.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(checkAuth.fulfilled, (state, action) => {
                state.isAuthenticated = true;
                state.user = action.payload;
                state.status = 'succeeded';
            })
            .addCase(checkAuth.rejected, (state) => {
                state.isAuthenticated = false;
                state.user = null;
                state.status = 'idle';
                // Don't set error for auth check failures
            });

        // Verify Email
        builder
            .addCase(verifyEmail.fulfilled, (state) => {
                if (state.user) {
                    state.user.verifiedAt = new Date();
                }
            })
            .addCase(verifyEmail.rejected, (state, action) => {
                state.error = action.payload as string || 'Verification failed';
            });

        // Fetch Profile
        builder
            .addCase(fetchProfile.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(fetchProfile.rejected, (state, action) => {
                state.error = action.payload as string || 'Failed to fetch profile';
            });
    },
});

export const { clearError, resetAuth } = authSlice.actions;

export default authSlice.reducer;
