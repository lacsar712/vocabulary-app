/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: "#6366f1",
                secondary: "#a855f7",
                accent: "#ec4899",
                background: "var(--color-bg-page)",
                surface: "var(--color-bg-surface)",
                'surface-hover': "var(--color-bg-surface-hover)",
                'text-primary': "var(--color-text-primary)",
                'text-secondary': "var(--color-text-secondary)",
                'text-muted': "var(--color-text-muted)",
                'text-faint': "var(--color-text-faint)",
                'border-default': "var(--color-border-default)",
                'border-strong': "var(--color-border-strong)",
                'input-bg': "var(--color-input-bg)",
                'input-border': "var(--color-input-border)",
                'card-bg': "var(--color-card-bg)",
                'card-border': "var(--color-card-border)",
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'glass': 'var(--shadow-glass)',
                'glass-lg': 'var(--shadow-glass-lg)',
            },
            backgroundColor: {
                'glass': 'var(--color-glass-bg)',
                'backdrop': 'var(--color-backdrop)',
            },
            borderColor: {
                'glass': 'var(--color-glass-border)',
            },
        },
    },
    plugins: [],
}
