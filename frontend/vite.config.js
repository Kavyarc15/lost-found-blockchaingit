import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy RPC calls to the local Hardhat node
    // This works in both local dev AND Codespaces because
    // the Vite server and Hardhat node are on the same machine.
    proxy: {
      '/rpc': {
        target: 'http://127.0.0.1:8545',
        changeOrigin: true,
        rewrite: () => '/',
      },
    },
  },
})
