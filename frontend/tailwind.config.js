import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f6eefc',
          100: '#efdff9',
          200: '#e2c3f3',
          300: '#c287f7',
          400: '#a544ef',
          500: '#8a1ce6',
          600: '#6c07c7',
          700: '#5c06a8',
          800: '#4c0589',
          900: '#3f066f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16, 24, 40, 0.04), 0 1px 3px 0 rgba(16, 24, 40, 0.06)',
        soft: '0 4px 24px -8px rgba(108, 7, 199, 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
    },
  },
  plugins: [forms],
};
