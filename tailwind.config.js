export const content = ["./src/**/*.{js,jsx,ts,tsx}", "./premium/src/**/*.{js,jsx,ts,tsx}", "./public/index.html"]

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./premium/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          elevated: 'var(--bg-elevated)',
          input: 'var(--bg-input)',

          /* New Semantic Tokens */
          sidebar: 'var(--bg-sidebar)',
          main: 'var(--bg-main)',
          card: 'var(--bg-card)',
          component: 'var(--bg-component)',
          'toggle-switch': 'var(--bg-toggle-switch)',
          'item-surface': 'var(--bg-item-surface)',
          'item-active': 'var(--bg-item-active)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          muted: 'var(--accent-muted)',
          'muted-hover': 'var(--accent-muted-hover)',
          bg: 'var(--accent-bg)',
          border: 'var(--accent-border)',
          secondary: 'var(--accent-muted)',
        },
        status: {
          success: 'var(--status-success)',
          'success-muted': 'var(--status-success-muted)',
          warning: 'var(--status-warning)',
          'warning-muted': 'var(--status-warning-muted)',
          error: 'var(--status-error)',
          'error-muted': 'var(--status-error-muted)',
          info: 'var(--status-info)',
          'info-muted': 'var(--status-info-muted)',
        },
        button: {
          primary: {
            bg: 'var(--btn-primary-bg)',
            hover: 'var(--btn-primary-hover)',
            'disabled-bg': 'var(--btn-primary-disabled-bg)',
            'disabled-border': 'var(--btn-primary-disabled-border)',
            'disabled-text': 'var(--btn-primary-disabled-text)',
            'shadow-color': 'var(--btn-primary-shadow-color)',
          },
          secondary: {
            bg: 'var(--btn-secondary-bg)',
            hover: 'var(--btn-secondary-hover)',
            border: 'var(--btn-secondary-border)',
            text: 'var(--btn-secondary-text)',
          },
          danger: {
            bg: 'var(--btn-danger-bg)',
            hover: 'var(--btn-danger-hover)',
            border: 'var(--btn-danger-border)',
            text: 'var(--btn-danger-text)',
          },
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          muted: 'var(--border-muted)',
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        celeb: ["CelebMF", "sans-serif"],
        "celeb-light": ["CelebMFLight", "sans-serif"]
      },
      transitionTimingFunction: {
        "apple-ease": "cubic-bezier(0.25, 1, 0.5, 1)",
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "sculpted": "cubic-bezier(0.22, 1, 0.36, 1)"
      },
      animation: {
        in: "in 0.2s ease-out",
        out: "out 0.2s ease-in",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "text-gradient-wave": "textGradientWave 2s infinite ease-in-out",
        "fade-in-up": "fadeInUp 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
      },
      keyframes: {
        textGradientWave: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" }
        },
        shimmer: {
          "0%": {
            backgroundPosition: "200% 0"
          },
          "100%": {
            backgroundPosition: "-200% 0"
          }
        },
        in: {
          "0%": { transform: "translateY(100%)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 }
        },
        out: {
          "0%": { transform: "translateY(0)", opacity: 1 },
          "100%": { transform: "translateY(100%)", opacity: 0 }
        },
        pulse: {
          "0%, 100%": {
            opacity: 1
          },
          "50%": {
            opacity: 0.5
          }
        },
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        },
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" }
        }
      }
    }
  },
  plugins: []
}
