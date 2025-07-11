import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const input = 'src/index.js';
const external = ['axios'];

const banner = `/*!
 * @doyosijs/laravel v1.0.0
 * JavaScript plugins for Laravel applications
 * (c) 2025 Karyazilim
 * Released under MIT License
 */`;

export default [
    // ESM build
    {
        input,
        external,
        output: {
            file: 'dist/index.esm.js',
            format: 'esm',
            sourcemap: true,
            banner
        },
        plugins: [nodeResolve()]
    },
    
    // CommonJS build
    {
        input,
        external,
        output: {
            file: 'dist/index.js',
            format: 'cjs',
            sourcemap: true,
            exports: 'auto',
            banner
        },
        plugins: [nodeResolve()]
    },
    
    // UMD build (for browser)
    {
        input,
        external,
        output: {
            file: 'dist/index.umd.js',
            format: 'umd',
            name: 'DoyosiJS',
            sourcemap: true,
            banner,
            globals: {
                axios: 'axios'
            }
        },
        plugins: [nodeResolve(), terser()]
    }
];