/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        surfaceborder: 'rgb(var(--color-surfaceborder) / <alpha-value>)',
        offwhite: 'rgb(var(--color-offwhite) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        tggreen: {
          DEFAULT: 'rgb(var(--color-tggreen) / <alpha-value>)',
          dark: 'rgb(var(--color-tggreen-dark) / <alpha-value>)',
        },
        tgamber: 'rgb(var(--color-tgamber) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
