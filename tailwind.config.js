/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 24px rgba(17, 38, 56, 0.08)",
        strong: "0 18px 36px rgba(9, 42, 63, 0.18)",
        panel: "0 10px 24px rgba(13, 39, 58, 0.1)"
      }
    }
  },
  plugins: []
};
