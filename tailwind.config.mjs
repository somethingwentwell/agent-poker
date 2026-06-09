/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        evo: {
          blue: "#6ec7e4",
          blue6: "#06cefc",
          blue5: "#89d1e8",
          blue4: "#a5daeb",
          blue3: "#c0e4ef",
          blue2: "#dcedf2",
          blue1: "#e9f2f4",
          green: "#77f2ae",
          yellow: "#ffd880",
          black: "#000000",
          gray11: "#53565a",
          gray9: "#757878",
          gray7: "#97999b",
          gray5: "#b1b3b3",
          gray3: "#c8c9c7",
          gray1: "#d9d9d6",
          white: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "HarmonyOS Sans SC", "PingFang SC", "sans-serif"],
        display: ["var(--font-orbitron)", "var(--font-outfit)", "sans-serif"],
      },
      backgroundImage: {
        "evo-gradient":
          "linear-gradient(90deg, #71c5fa 0%, #6ec7e4 40%, #79f2ae 70%, #77f2ae 100%)",
        "evo-gradient-subtle":
          "linear-gradient(135deg, rgba(110,199,228,0.08) 0%, rgba(119,242,174,0.05) 100%)",
      },
    },
  },
  plugins: [],
};
