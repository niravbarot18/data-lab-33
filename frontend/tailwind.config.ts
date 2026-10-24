import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#101C2C',
          800: '#17283C',
          700: '#1E3550',
        },
        forecast: {
          DEFAULT: '#2563EB', // Forecast blue
          light: '#3B82F6',
          dark: '#1D4ED8',
          bg: '#EFF6FF',
        },
        actual: {
          DEFAULT: '#0D9488', // Actual teal
          light: '#14B8A6',
          dark: '#0F766E',
          bg: '#F0FDFA',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#F59E0B',
          bg: '#FFFBEB',
        },
        surface: {
          canvas: '#F8FAFC',
          light: '#F1F5F9',
          card: '#FFFFFF',
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
} satisfies Config;
