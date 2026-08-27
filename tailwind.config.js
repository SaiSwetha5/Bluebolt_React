/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cognizant brand colors
        brand: {
          50:  "#e6eeff",
          100: "#c0d2ff",
          200: "#96b3ff",
          300: "#6690ff",
          400: "#3d6fff",
          500: "#0033A0",   // Cognizant primary blue
          600: "#0033A0",
          700: "#002680",
          800: "#001F5B",   // Cognizant dark navy
          900: "#001340",
          950: "#000a28"
        },
        cognizant: {
          blue:   "#0033A0",
          navy:   "#001F5B",
          light:  "#00A9E0",
          accent: "#009FDB"
        },
        slate: {
          925: "#0c1120"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 3px 0 rgb(15 23 42 / 0.08)"
      }
    }
  },
  plugins: []
};
