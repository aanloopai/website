/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Brand colors — never recolor or reorder
        navy: '#0F172A',
        pearl: '#F1F5F9',
        midnight: '#0B1120',
        // Accent (fixed sequence: indigo → rose → amber → emerald)
        brand: {
          indigo: '#4338CA',
          rose: '#E11D48',
          amber: '#D97706',
          emerald: '#047857',
        },
        // Neutrals scaled to navy
        slate: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        'wordmark': '-0.0375em',
        'tightest': '-0.04em',
        'tighter-2': '-0.025em',
      },
      maxWidth: {
        'container': '1200px',
        'prose-wide': '72ch',
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.8s ease-out forwards',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
