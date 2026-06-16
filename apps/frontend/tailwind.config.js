/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        body: ['"VT323"', "monospace"],
      },
      colors: {
        biome: {
          what: "#f4d37a",
          how: "#8fbf6d",
          why: "#c0a87a",
          system: "#6b5b95",
        },
        paper: "#f2d79c",
        ink: "#1a1226",
        accent: "#f5b642",
      },
    },
  },
  plugins: [],
};
