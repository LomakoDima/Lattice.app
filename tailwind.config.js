/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
        /** Auth / marketing body — same as sans for consistency */
        auth: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        nexus: {
          void: '#050506',
          ink: '#0c0c0e',
          panel: '#111113',
          line: 'rgba(255,255,255,0.07)',
          muted: '#8a8a8f',
          accent: '#c8f562',
          'accent-dim': '#9fb84a',
        },
      },
      backgroundImage: {
        'nexus-grid':
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        'nexus-fade':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(200,245,98,0.12), transparent 55%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        marquee: 'marquee 32s linear infinite',
        'launch-toast': 'launchToast 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both',
        'toast-slide-up': 'toastSlideUp 0.52s cubic-bezier(0.16, 1, 0.3, 1) both',
        /** duration set via inline style (matches toast timeout) */
        'toast-progress': 'toastProgress linear forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        launchToast: {
          '0%': { opacity: '0', transform: 'translate(1.25rem, 1.5rem) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translate(0, 0) scale(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        toastSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        toastProgress: {
          from: { transform: 'scaleX(1)' },
          to: { transform: 'scaleX(0)' },
        },
      },
    },
  },
  plugins: [],
};
