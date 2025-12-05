// ============================================
// useApi Hook - Custom React Hook for API Calls
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseApiReturn<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    retry: () => Promise<void>;
}

interface UseApiOptions {
    skip?: boolean;
    retryCount?: number;
    retryDelay?: number;
}

/**
 * Custom hook for API calls with automatic error handling, retry logic, and loading states
 * 
 * @param apiCall - Async function that returns a Promise
 * @param dependencies - Array of dependencies that trigger refetch when changed
 * @param options - Optional configuration (skip, retryCount, retryDelay)
 * @returns Object containing data, loading, error, refetch, and retry functions
 * 
 * @example
 * const { data, loading, error, refetch } = useApi(
 *   () => api.incidents.getAll()
 * );
 */
export function useApi<T>(
    apiCall: () => Promise<T>,
    dependencies: any[] = [],
    options: UseApiOptions = {}
): UseApiReturn<T> {
    const { skip = false, retryCount: maxRetries = 3, retryDelay: baseDelay = 1000 } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(!skip);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState<number>(0);

    const navigate = useNavigate();
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef<boolean>(true);

    /**
     * Execute the API call with error handling and retry logic
     */
    const executeApiCall = useCallback(async (isRetry: boolean = false) => {
        // Skip if skip option is true
        if (skip) return;

        // Abort any ongoing requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            const result = await apiCall();

            // Only update state if component is still mounted
            if (isMountedRef.current) {
                setData(result);
                setError(null);
                setRetryCount(0); // Reset retry count on success
            }
        } catch (err: any) {
            // Ignore aborted requests
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                return;
            }

            // Only update state if component is still mounted
            if (!isMountedRef.current) return;

            // Handle 401 Unauthorized - redirect to login
            if (err.response?.status === 401) {
                localStorage.removeItem('rrs_access_token');
                localStorage.removeItem('rrs_user');
                navigate('/login');
                return;
            }

            // Determine error message
            let errorMessage: string;

            if (err.response) {
                // HTTP error response
                const status = err.response.status;
                const message = err.response.data?.message || err.response.data?.error || err.message;

                switch (status) {
                    case 404:
                        errorMessage = 'Resource not found';
                        break;
                    case 500:
                    case 502:
                    case 503:
                        errorMessage = `Server error (${status}): ${message}`;
                        break;
                    default:
                        errorMessage = message || `Request failed with status ${status}`;
                }
            } else if (err.request) {
                // Network error (no response received)
                errorMessage = 'Network error: Unable to connect to server';
            } else {
                // Other errors
                errorMessage = err.message || 'An unexpected error occurred';
            }

            // Auto-retry logic (only if not manual retry)
            if (!isRetry && retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
                console.log(`Retrying API call in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

                setTimeout(() => {
                    if (isMountedRef.current) {
                        setRetryCount((prev) => prev + 1);
                        executeApiCall(false);
                    }
                }, delay);

                setError(`${errorMessage}. Retrying...`);
            } else {
                // Max retries exceeded or manual retry
                setError(errorMessage);
                console.error('API call failed:', err);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [apiCall, skip, retryCount, maxRetries, baseDelay, navigate]);

    /**
     * Manual refetch function
     */
    const refetch = useCallback(async () => {
        setRetryCount(0); // Reset retry count
        await executeApiCall(false);
    }, [executeApiCall]);

    /**
     * Manual retry function (after error)
     */
    const retry = useCallback(async () => {
        setRetryCount(0); // Reset retry count
        await executeApiCall(true);
    }, [executeApiCall]);

    /**
     * Execute API call on mount and when dependencies change
     */
    useEffect(() => {
        isMountedRef.current = true;

        if (!skip) {
            executeApiCall(false);
        }

        return () => {
            isMountedRef.current = false;
            // Abort ongoing request on unmount
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...dependencies, skip]);

    return {
        data,
        loading,
        error,
        refetch,
        retry,
    };
}

export default useApi;
