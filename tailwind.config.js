/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "./SwingEdge_App.jsx",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          sunken:   'var(--surface-sunken)',
          elevated: 'var(--surface-elevated)',
        },
        border: {
          soft:   'var(--border-soft)',
          medium: 'var(--border-medium)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
          muted:     'var(--text-muted)',
        },
      },
      fontFamily: {
        sans:   ['General Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono:   ['JetBrains Mono', 'SF Mono', 'ui-monospace'],
        hebrew: ['Heebo', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm:    'var(--radius-sm)',
        md:    'var(--radius-md)',
        lg:    'var(--radius-lg)',
        xl:    'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        pill:  'var(--radius-pill)',
      },
      boxShadow: {
        xs:   'var(--shadow-xs)',
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
      },
    },
  },
  plugins: [],
};
