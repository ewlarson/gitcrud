import { useState, useCallback, useEffect } from 'react';

export function useUrlState<T extends Record<string, any>>(
    initialState: T,
    mapping: {
        toUrl: (state: T) => URLSearchParams;
        fromUrl: (params: URLSearchParams) => T;
        cleanup?: (params: URLSearchParams) => void;
    }
) {
    const [state, setState] = useState<T>(() => {
        // Init from URL on mount
        const params = new URLSearchParams(window.location.search);
        return { ...initialState, ...mapping.fromUrl(params) };
    });

    const updateState = useCallback((newState: T | ((prev: T) => T)) => {
        setState((prev) => {
            const next = typeof newState === 'function' ? (newState as any)(prev) : newState;

            const currentParams = new URLSearchParams(window.location.search);

            // Cleanup old owned params
            if (mapping.cleanup) {
                mapping.cleanup(currentParams);
            }

            // Apply new params
            const newParams = mapping.toUrl(next);
            for (const [key, value] of newParams.entries()) {
                currentParams.append(key, value);
            }

            const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
            window.history.pushState({}, '', newUrl);

            return next;
        });
    }, [mapping]);

    // Listen to popstate
    useEffect(() => {
        const onPopState = () => {
            const params = new URLSearchParams(window.location.search);
            setState({ ...initialState, ...mapping.fromUrl(params) });
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [mapping, initialState]);

    return [state, updateState] as const;
}
