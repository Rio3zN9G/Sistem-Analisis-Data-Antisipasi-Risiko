import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#090a12",
        panel: "#11121d",
        violet: {
          DEFAULT: "#9275ff",
          200: "#c4b5fd",
          300: "#a78bfa",
          400: "#9275ff",
          500: "#7c3aed"
        },
        mint: {
          DEFAULT: "#6de6bd",
          200: "#a7f3d0",
          300: "#6de6bd"
        }
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 42px rgba(146, 117, 255, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
