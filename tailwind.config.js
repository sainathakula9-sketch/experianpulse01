/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        experian: {
          purple: '#5f259f',
          magenta: '#d7197d',
          blue: '#00a3e0',
          ink: '#172033',
          slate: '#536176',
          mist: '#f4f7fb'
        }
      },
      boxShadow: {
        enterprise: '0 18px 45px rgba(23, 32, 51, 0.10)'
      }
    }
  },
  plugins: []
}
