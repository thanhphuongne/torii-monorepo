import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important: sends cookies automatically
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
        // Fallback for standard NestJS error format if success: false is missing
        if (data?.message) {
            if (Array.isArray(data.message)) {
                return data.message[0];
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
        '/auth/refresh', // Refresh itself should be considered "safe" to fail
    ];

    // Normalize URL by removing query params and hash for matching, and trim trailing slash
    const normalizedUrl = (url.split(/[?#]/)[0] ?? '').replace(/\/$/, '');

    return publicEndpoints.some(endpoint => normalizedUrl.endsWith(endpoint));
};

/**
 * Check if the current page requires authentication.
 * Instead of whitelisting everything public, we check for protected prefixes
 * to allow 404s and search engines to reach non-existent pages or other public routes.
 */
const isProtectedRoute = (pathname: string): boolean => {
    const protectedPrefixes = ['/learn', '/courses', '/profile', '/settings', '/dashboard', '/checkout', '/ai-sensei'];
    return protectedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
};

/**
 * Check if current page is public
 */
const isPublicPage = (): boolean => {
    if (typeof window === 'undefined') return false;
    const pathname = window.location.pathname;

    // If it's explicitly a protected route, it's not public
    return !isProtectedRoute(pathname);
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
    // Only run on client-side
    if (typeof window === 'undefined') {
        return;
    }

    // Prevent multiple simultaneous redirects
    if (isRedirecting) {
        return;
    }

    isRedirecting = true;

    // Check if we are already on an auth page
    const pathname = window.location.pathname;
    const authPages = ['/login', '/register', '/forgot-password', '/reset-password', '/verify', '/verify-otp'];
    const isAlreadyOnAuthPage = authPages.some(page => pathname === page || pathname.startsWith(page + '/'));

    if (isAlreadyOnAuthPage) {
        isRedirecting = false;
        return;
    }

    console.warn('Authentication failed - clearing session and redirecting to login');

    try {
        // Force clear all local states by calling logout API
        // We use a separate axios instance or native fetch here to avoid interceptors if needed,
        // but apiClient should be fine now that we handle logout/login in isPublicEndpoint correctly.
        await apiClient.post('/api/auth/logout').catch(() => { });
    } catch (e) {
        // Ignore
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

        // Avoid browser ETag caching causing 304 without usable body for XHR/axios
        // (API responses should be treated as dynamic for the app shell)
        if (config.method?.toLowerCase() === 'get') {
            config.headers['Cache-Control'] = 'no-cache';
            config.headers['Pragma'] = 'no-cache';
            config.headers['Expires'] = '0';
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
                // For login/register/logout, return error so UI can handle it
                if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/logout')) {
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

            // Mark request as retried to prevent infinite loops
            originalRequest._retry = true;

            // Check if refresh token exists before attempting refresh
            // Note: hasRefreshToken() always returns true currently as we can't check HttpOnly cookies
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

            isRefreshing = true;

            try {
                // Attempt to refresh tokens
                console.log('Access token expired, refreshing...');
                await apiClient.post('/api/auth/refresh');

                // Refresh successful
                console.log('Token refreshed successfully');
                isRefreshing = false;
                processQueue(); // Resolve all queued requests

                // Retry the original request
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear queue and notify the app
                console.error('Token refresh failed:', refreshError);
                isRefreshing = false;
                processQueue(refreshError);

                // Proactively clear cookies by calling logout
                // Use a standard fetch or separate instance if needed, but apiClient with its safe public check is fine
                apiClient.post('/api/auth/logout').catch(() => { });

                // Dispatch event so Redux can reset its state even if we don't redirect
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('auth:expired'));
                }

                // Determine if we should redirect to login:
                // 1. If we are on a protected page, ALWAYS redirect on fetch failure
                // 2. If we are on a public page, only redirect if the request was NOT for a background auth check
                const url = originalRequest.url || '';
                const isMeRequest = url.endsWith('/auth/me') || url.endsWith('/me');

                if (!isPublicPage() || !isMeRequest) {
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
