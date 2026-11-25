import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: { navy: "#0B1830", electric: "#3478F6", mint: "#20B99A", mist: "#F4F7FB" },
    boxShadow: { soft: "0 12px 35px rgba(16, 37, 70, .08)" }
  }},
  plugins: []
};
export default config;
