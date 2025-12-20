import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-primary': '#0a0b0d',
        'bg-card': '#111417',
        'bg-secondary': '#161a1e',

        // Primary accent - Mint green
        mint: {
          DEFAULT: '#35e5a0',
          hover: '#4aeeb0',
          glow: 'rgba(42, 250, 224, 0.1)',
        },

        // Legacy primary (blue) - keep for compatibility
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#60A5FA',
          active: '#2563EB',
        },

        // Semantic colors
        success: '#35e5a0', // Updated to mint
        warning: '#fbbf24',
        danger: '#f87171',
        info: '#60a5fa',

        // Text colors
        'text-primary': '#f3f6f8',
        'text-secondary': '#a6b0b8',
        'text-muted': '#6d7881',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
