var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { fontFamily } from 'tailwindcss/defaultTheme';
import animate from 'tailwindcss-animate';
export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        container: { center: true, padding: '1.5rem', screens: { '2xl': '1440px' } },
        extend: {
            colors: {
                brand: {
                    50: '#F4F5FD', 100: '#EEF0FC', 200: '#DADDF7', 300: '#B9BFF0', 400: '#8F98E5',
                    500: '#5E6AD2', 600: '#5260C8', 700: '#4B57C2', 800: '#363E86', 900: '#2C3369', 950: '#1B1F40',
                },
                ink: {
                    0: '#FFFFFF', 25: '#FAFAFB', 50: '#F4F4F6', 100: '#F1F1F4', 150: '#E6E6EB', 200: '#D4D5DC',
                    300: '#B4B6BF', 400: '#8A8C97', 500: '#6E707B', 600: '#5E606B', 700: '#3F4149',
                    800: '#25262B', 850: '#1F2024', 900: '#16171A', 925: '#101113', 950: '#0D0E10', DEFAULT: '#1C1D21',
                },
                background: 'hsl(var(--background) / <alpha-value>)',
                foreground: 'hsl(var(--foreground) / <alpha-value>)',
                card: { DEFAULT: 'hsl(var(--card) / <alpha-value>)', foreground: 'hsl(var(--card-foreground) / <alpha-value>)' },
                popover: { DEFAULT: 'hsl(var(--popover) / <alpha-value>)', foreground: 'hsl(var(--popover-foreground) / <alpha-value>)' },
                'surface-2': 'hsl(var(--surface-2) / <alpha-value>)',
                sidebar: 'hsl(var(--sidebar) / <alpha-value>)',
                primary: {
                    DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
                    hover: 'hsl(var(--primary-hover) / <alpha-value>)',
                    foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
                    soft: 'hsl(var(--primary-soft))',
                    text: 'hsl(var(--primary-text) / <alpha-value>)',
                },
                'primary-soft': 'hsl(var(--primary-soft))',
                'primary-text': 'hsl(var(--primary-text) / <alpha-value>)',
                secondary: { DEFAULT: 'hsl(var(--secondary) / <alpha-value>)', foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)' },
                muted: { DEFAULT: 'hsl(var(--muted) / <alpha-value>)', foreground: 'hsl(var(--muted-foreground) / <alpha-value>)' },
                'subtle-foreground': 'hsl(var(--subtle-foreground) / <alpha-value>)',
                accent: { DEFAULT: 'hsl(var(--accent) / <alpha-value>)', foreground: 'hsl(var(--accent-foreground) / <alpha-value>)' },
                destructive: { DEFAULT: 'hsl(var(--destructive) / <alpha-value>)', foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)' },
                border: { DEFAULT: 'hsl(var(--border) / <alpha-value>)', strong: 'hsl(var(--border-strong) / <alpha-value>)' },
                'border-strong': 'hsl(var(--border-strong) / <alpha-value>)',
                input: 'hsl(var(--input) / <alpha-value>)',
                ring: 'hsl(var(--ring) / <alpha-value>)',
                success: { DEFAULT: 'hsl(var(--success) / <alpha-value>)', muted: 'hsl(var(--success-muted))', icon: 'hsl(var(--success-icon) / <alpha-value>)' },
                warning: { DEFAULT: 'hsl(var(--warning) / <alpha-value>)', muted: 'hsl(var(--warning-muted))', icon: 'hsl(var(--warning-icon) / <alpha-value>)' },
                danger: { DEFAULT: 'hsl(var(--danger) / <alpha-value>)', muted: 'hsl(var(--danger-muted))', icon: 'hsl(var(--danger-icon) / <alpha-value>)' },
                skeleton: 'hsl(var(--skeleton) / <alpha-value>)',
            },
            fontFamily: {
                sans: __spreadArray(['Inter', 'InterVariable'], fontFamily.sans, true),
                mono: __spreadArray(['"JetBrains Mono"'], fontFamily.mono, true),
            },
            fontSize: {
                '2xs': ['11px', { lineHeight: '16px' }],
                xs: ['12px', { lineHeight: '16px' }],
                sm: ['13px', { lineHeight: '20px' }],
                base: ['14px', { lineHeight: '22px' }],
                md: ['15px', { lineHeight: '22px', fontWeight: '600' }],
                lg: ['16px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
                xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.015em' }],
                '2xl': ['26px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
            },
            borderRadius: {
                sm: '4px',
                DEFAULT: '6px',
                md: '6px',
                lg: '8px',
                xl: '10px',
                sheet: '14px',
            },
            spacing: {
                4.5: '18px',
                13: '52px',
                15: '60px',
                sidebar: '220px',
                drawer: '460px',
            },
            boxShadow: {
                xs: 'var(--shadow-xs)',
                overlay: 'var(--shadow-overlay)',
                focus: '0 0 0 3px hsl(var(--ring) / 0.3)',
                'focus-danger': '0 0 0 3px hsl(var(--danger-muted))',
            },
            transitionDuration: { DEFAULT: '150ms' },
            keyframes: {
                'sheet-in': { from: { transform: 'translateX(16px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
                'sheet-up': { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
            },
            animation: {
                'sheet-in': 'sheet-in 200ms cubic-bezier(.2,.8,.2,1)',
                'sheet-up': 'sheet-up 220ms cubic-bezier(.2,.8,.2,1)',
            },
        },
    },
    plugins: [animate],
};
