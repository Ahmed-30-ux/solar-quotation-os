/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        navy: {
          50: '#f0f4ff',
          100: '#e0e8ff',
          200: '#c7d4fe',
          300: '#a4b8fc',
          400: '#7a93f8',
          500: '#5570f0',
          600: '#3a4de4',
          700: '#2d3cc5',
          800: '#1e2d6d',
          900: '#0f172a',
          950: '#0a0f1e',
        },
        surface: {
          0: '#0a0f1e',
          1: '#0f172a',
          2: '#131c33',
          3: '#1a2440',
          4: '#1e2d4d',
          5: '#243352',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.2), 0 1px 3px 0 rgb(0 0 0 / 0.3)',
        lift: '0 10px 30px -12px rgb(0 0 0 / 0.5)',
        'brand-glow': '0 8px 24px -8px rgb(245 158 11 / 0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgb(255 255 255 / 0.05)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
