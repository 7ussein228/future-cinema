export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#e09e1f',
          pink: '#ffcf5c',
          gold: '#f5b32f',
          dark: '#0c0c0e',
          darker: '#050506',
          card: '#17171a'
        }
      },
      fontFamily: {
        display: ['"Cairo"', '"Tajawal"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(124,58,237,0.6)'
      }
    }
  },
  plugins: []
}
