import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    resetToSystem: () => void;
    themeLabel: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'vocabulary-app-theme';

const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const getStoredTheme = (): Theme => {
    if (typeof localStorage === 'undefined') return 'system';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }
    return 'system';
};

const resolveTheme = (theme: Theme, systemTheme: ResolvedTheme): ResolvedTheme =>
    theme === 'system' ? systemTheme : theme;

const applyThemeToDom = (resolved: ResolvedTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

    const resolvedTheme: ResolvedTheme = useMemo(
        () => resolveTheme(theme, systemTheme),
        [theme, systemTheme]
    );

    useLayoutEffect(() => {
        applyThemeToDom(resolvedTheme);
    }, [resolvedTheme]);

    useLayoutEffect(() => {
        try {
            document.body.style.removeProperty('background-color');
            document.body.style.removeProperty('color');
            document.body.style.removeProperty('transition');
        } catch (e) {}
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const handleChange = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? 'light' : 'dark');
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => {
            const current = prev === 'system' ? systemTheme : prev;
            const next: ResolvedTheme = current === 'dark' ? 'light' : 'dark';
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, [systemTheme]);

    const resetToSystem = useCallback(() => {
        setThemeState('system');
        localStorage.setItem(STORAGE_KEY, 'system');
    }, []);

    const themeLabel = useMemo(() => {
        if (theme === 'system') {
            return `跟随系统（${systemTheme === 'dark' ? '深色' : '浅色'}）`;
        }
        return theme === 'dark' ? '深色模式' : '浅色模式';
    }, [theme, systemTheme]);

    const value = useMemo(() => ({
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        resetToSystem,
        themeLabel,
    }), [theme, resolvedTheme, setTheme, toggleTheme, resetToSystem, themeLabel]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
