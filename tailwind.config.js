/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 在這裡新增我們自己的顏色
      colors: {
        'brand-red': '#B91C1C', // 這是一個深紅色
        'brand-purple': {
          light: '#DDD6FE', // 這是淺紫色 (背景)
          dark: '#5B21B6',   // 這是深紫色 (文字)
        }
      }
    },
  },
  plugins: [],
}
