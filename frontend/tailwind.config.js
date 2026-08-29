import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          50: '#f6f6f7',
          100: '#ebebed',
          200: '#d6d6da',
          300: '#b3b3ba',
          400: '#85858f',
          500: '#5e5e67',
          600: '#414149',
          700: '#2c2c32',
          800: '#1c1c20',
          900: '#121215',
          950: '#0a0a0c',
        },
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
        soft: '0 4px 24px -8px rgba(18, 18, 21, 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
    },
  },
  plugins: [forms],
};
