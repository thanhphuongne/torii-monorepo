import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for Cookies
});

// State for refresh token process
let isRefreshing = false;
let isRedirecting = false; // Prevent multiple simultaneous redirects
let failedRequestsQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (error?: unknown) => void;
}> = [];

/**
 * Extract user-friendly error message from axios error
 * 
 * Standard Format:
 * - Success: { success: true, data: any, message?: string }
 * - Error: { success: false, message: string, errors?: any[] }
 */
const extractErrorMessage = (error: AxiosError): string => {
    // 1. Standard format error (case chính)
    if (error.response?.data) {
        const data = error.response.data as any;
        if (data?.success === false && data?.message) {
            // Include validation errors if available
            if (data.errors?.length > 0) {
                const details = data.errors
                    .map((e: any) => typeof e === 'string' ? e : e.message || e)
                    .filter(Boolean)
                    .join(', ');
                return `${data.message} (${details})`;
            }
            return data.message;
        }
    }

    // 2. Network errors
    if (error.code === 'ECONNABORTED') {
        return 'Request timeout. Please try again.';
    }
    if (error.code === 'ERR_NETWORK' || !error.response) {
        return 'Network error. Please check your connection and try again.';
    }

    // 3. Infrastructure errors (Gateway/Load Balancer - may not have standard format)
    const status = error.response?.status;
    if (status === 502) return 'Bad gateway. Please try again later.';
    if (status === 503) return 'Service unavailable. Please try again later.';
    if (status === 504) return 'Gateway timeout. Please try again later.';
    if (status === 500 && !error.response?.data) {
        return 'Server error. Please try again later.';
    }

    // 4. Final fallback
    return error.message || 'An unexpected error occurred.';
};

/**
 * Check if endpoint is public (doesn't require auth)
 */
const isPublicEndpoint = (url?: string): boolean => {
    if (!url) return false;

    const publicEndpoints = [
        '/auth/login',
        '/auth/admin/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/verify',
        '/auth/verify-email',
        '/auth/resend-verification',
        '/auth/verify-otp',
        '/auth/resend-otp',
        '/auth/verify-reset-token',
        '/auth/verify-invite-token',
        '/auth/set-password',
        '/auth/logout',
    ];

    return publicEndpoints.some(endpoint => url.includes(endpoint));
};

/**
 * Check if current page is public
 */
const isPublicPage = (): boolean => {
    if (typeof window === 'undefined') return false;

    const publicPages = [
        '/login',
        '/auth/login',
        '/forgot-password',
        '/auth/forgot-password',
        '/auth/verify-2fa',
        '/auth/verify-otp'
    ];

    return publicPages.some(page => window.location.pathname.startsWith(page));
};

/**
 * Check if refresh token exists in cookies
 */
const hasRefreshToken = (): boolean => {
    // We can't actually check HttpOnly cookies from JS.
    // So we assume it might exist and let the backend decide.
    return true;
};

/**
 * Process all queued requests after token refresh
 */
const processQueue = (error: unknown = null) => {
    failedRequestsQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve();
        }
    });
    failedRequestsQueue = [];
};

/**
 * Safely redirect to login page, avoiding infinite loops
 * Clears server-side auth state (cookies) before redirecting
 */
const redirectToLogin = async () => {
    // Prevent multiple simultaneous redirects
    if (isRedirecting) {
        return;
    }

    isRedirecting = true;
    console.warn('Authentication failed - clearing session and redirecting to login');

    try {
        // Force clear all local states by calling logout API
        // This will have the backend clear cookies even if user is on login page
        await apiClient.post('/api/auth/logout').catch(() => { });
    } catch (e) {
        // Ignore
    }

    // Don't redirect if already on login page, but maybe refresh to clear storage
    if (isPublicPage()) {
        isRedirecting = false;
        return;
    }

    window.location.href = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
};

// Request interceptor - Add platform header for web
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Add platform header to identify web client
        if (typeof window !== 'undefined') {
            config.headers['x-platform'] = 'web';
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle 401 errors with automatic token refresh
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If no config, pass through
        if (!originalRequest) {
            return Promise.reject(error);
        }

        // Check if error is 401 and we haven't already retried this request
        if (error.response?.status === 401 && !originalRequest._retry) {
            const url = originalRequest.url || '';

            // Don't attempt refresh on specific auth endpoints
            if (isPublicEndpoint(url)) {
                // For login/logout, return error so UI can handle it
                if (url.includes('/auth/login') || url.includes('/auth/admin/login') || url.includes('/auth/logout')) {
                    return Promise.reject(error);
                }
                // For other public endpoints, just reject
                return Promise.reject(error);
            }

            // If refresh endpoint itself fails, abort everything
            if (url.includes('/auth/refresh')) {
                console.warn('Refresh token is invalid or expired. Aborting refresh flow.');
                isRefreshing = false;
                processQueue(error);
                redirectToLogin();
                return Promise.reject(error);
            }

            // If we're already on a public page, don't even try to refresh.
            // Just fail the request so the UI stays responsive.
            if (isPublicPage()) {
                console.log('Already on public page, skipping token refresh for 401 error');
                return Promise.reject(error);
            }

            // Check if refresh token exists before attempting refresh
            if (!hasRefreshToken()) {
                console.log('No refresh token found, skipping token refresh');
                redirectToLogin();
                return Promise.reject(error);
            }

            // If a refresh is already in progress, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedRequestsQueue.push({ resolve, reject });
                })
                    .then(() => {
                        // Retry original request after refresh completes
                        return apiClient(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            // Mark request as retried to prevent infinite loops
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh tokens
                console.log('Access token expired, refreshing...');
                await apiClient.post('/api/auth/refresh');

                // Refresh successful
                console.log('Token refreshed successfully');
                processQueue(); // Resolve all queued requests
                isRefreshing = false;

                // Retry the original request
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear queue and redirect to login
                console.error('Token refresh failed:', refreshError);
                processQueue(refreshError);
                isRefreshing = false;

                // Only redirect if we're not on a public page
                if (!isPublicPage()) {
                    redirectToLogin();
                }
                return Promise.reject(refreshError);
            }
        }

        // For other status codes, enhance error message and pass through
        const enhancedError = error;
        if (enhancedError.response) {
            // Attach extracted message to error for easier access
            (enhancedError as any).userMessage = extractErrorMessage(error);
        }
        return Promise.reject(enhancedError);
    }
);

// Export error extraction utility for use in components
export { extractErrorMessage };
