import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--md-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Legacy aliases
        sidebar:       v('sidebar'),
        accent:        v('accent'),
        'accent-light': v('accent-light'),
        'accent-dark': v('primary-container'),

        // Design system — all via CSS variables
        primary:                   v('primary'),
        'primary-container':       v('primary-container'),
        'primary-fixed':           v('primary-fixed'),
        'on-primary':              v('on-primary'),
        'on-primary-container':    v('on-primary-container'),
        secondary:                 v('secondary'),
        'secondary-container':     v('secondary-container'),
        'on-secondary-container':  v('on-secondary-container'),
        surface:                   v('surface'),
        'surface-dim':             v('surface-dim'),
        'surface-bright':          v('surface-bright'),
        'surface-container-lowest':  v('surface-container-lowest'),
        'surface-container-low':     v('surface-container-low'),
        'surface-container':         v('surface-container'),
        'surface-container-high':    v('surface-container-high'),
        'surface-container-highest': v('surface-container-highest'),
        'surface-variant':         v('surface-variant'),
        'on-surface':              v('on-surface'),
        'on-surface-variant':      v('on-surface-variant'),
        background:                v('background'),
        'on-background':           v('on-background'),
        outline:                   v('outline'),
        'outline-variant':         v('outline-variant'),
        'inverse-surface':         v('inverse-surface'),
        'inverse-on-surface':      v('inverse-on-surface'),
        'inverse-primary':         v('inverse-primary'),
        error:                     v('error'),
        'error-container':         v('error-container'),
        'on-error':                v('on-error'),
        'on-error-container':      v('on-error-container'),

        // Brand colors
        brand: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          900: '#134e4a',
        },
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
