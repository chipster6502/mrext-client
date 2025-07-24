import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
    // Load environment variables
    const env = loadEnv(mode, process.cwd(), '');
    
    // MiSTer configuration for development proxy - can be overridden with .env.development
    const misterHost = env.VITE_MISTER_HOST || '192.168.1.222';
    const misterPort = env.VITE_MISTER_PORT || '8182';
    const misterUrl = `http://${misterHost}:${misterPort}`;
    
    console.log(`🚀 Vite: Configuring proxy to MiSTer at ${misterUrl}`);

    return {
        build: {
            outDir: 'build',
        },
        plugins: [react(), tsconfigPaths()],
        server: {
            host: true, // Allow external connections
            proxy: {
                // Proxy all API routes to MiSTer
                '/api': {
                    target: misterUrl,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path,
                    configure: (proxy, _options) => {
                        proxy.on('error', (err, _req, _res) => {
                            console.log('🔴 Proxy error:', err.message);
                        });
                        // Uncomment for detailed proxy logging:
                        // proxy.on('proxyReq', (proxyReq, req, _res) => {
                        //     console.log(`🔄 Proxying: ${req.method} ${req.url} → ${misterUrl}${req.url}`);
                        // });
                    },
                },
            },
        },
        // Global constants available in the app
        define: {
            __DEV__: JSON.stringify(mode === 'development'),
            __MISTER_HOST__: JSON.stringify(misterHost),
            __MISTER_PORT__: JSON.stringify(misterPort),
            __MISTER_URL__: JSON.stringify(misterUrl),
        },
    };
});