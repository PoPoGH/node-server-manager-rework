import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 8085,
    proxy: {
      '/api': {
        target: 'http://192.168.1.113:3001', // Updated target
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: 'ws://192.168.1.113:3001', // Updated target
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('proxying WS request', req.url, 'to', options.target);
          });
          proxy.on('open', (proxySocket) => {
            console.log('WS proxy opened');
          });
          proxy.on('close', (res, socket, head) => {
            console.log('WS proxy closed');
          });
        }
      }
    }
  },
  build: {
    minify: false // Désactiver la minification
  }
});