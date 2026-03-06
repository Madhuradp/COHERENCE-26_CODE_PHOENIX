/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#8B5CF6",
          "purple-light": "#EDE9FE",
          "purple-mid": "#C4B5FD",
          blue: "#60A5FA",
          "blue-light": "#DBEAFE",
          orange: "#FB923C",
          "orange-light": "#FFEDD5",
          teal: "#2DD4BF",
          "teal-light": "#CCFBF1",
          rose: "#F87171",
          "rose-light": "#FEE2E2",
        },
        surface: {
          bg: "#F1F5F9",
          card: "#FFFFFF",
          border: "#E2E8F0",
          muted: "#F8FAFC",
        },
        text: {
          primary: "#0F172A",
          secondary: "#475569",
          muted: "#94A3B8",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.06), 0 4px 24px 0 rgba(0,0,0,0.04)",
        "card-hover": "0 4px 16px 0 rgba(139,92,246,0.12), 0 1px 3px 0 rgba(0,0,0,0.06)",
        glass: "0 8px 32px 0 rgba(31,38,135,0.1)",
      },
      backgroundImage: {
        "auth-gradient": "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 50%, #FFEDD5 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "count-up": "count-up 0.6s ease forwards",
      },
    },
  },
  plugins: [],
};
