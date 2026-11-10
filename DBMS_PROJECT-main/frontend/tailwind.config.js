/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // JSS STU Academic Theme Colors
        navy: {
          DEFAULT: "#173D70",
          hover: "#0F294D",
          dark: "#0F294D",
          light: "#315F91",
        },
        'secondary-blue': '#315F91',
        'light-blue': '#EBF3FC',
        'page-bg': '#F5F7FA',
        'card-bg': '#FFFFFF',
        'table-header': '#F1F5F9',
        'border-color': '#E2E8F0',
        'primary-text': '#1E293B',
        'secondary-text': '#64748B',
        'muted-text': '#94A3B8',
        status: {
          open: '#0284C7',
          investigating: '#7C3AED',
          resolved: '#16A34A',
          critical: '#DC2626',
          high: '#EA580C',
          medium: '#D97706',
          low: '#2563EB',
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "#173D70",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#EBF3FC",
          foreground: "#173D70",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#EBF3FC",
          foreground: "#173D70",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#173D70",
      },
      boxShadow: {
        'academic': '0 1px 3px 0 rgba(23, 61, 112, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'academic-card': '0 2px 6px -1px rgba(23, 61, 112, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'academic-hover': '0 10px 15px -3px rgba(23, 61, 112, 0.08), 0 4px 6px -2px rgba(23, 61, 112, 0.04)',
      },
    },
  },
  plugins: [],
}
