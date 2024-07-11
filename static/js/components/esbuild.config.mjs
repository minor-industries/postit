import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const vuePath = resolve(__dirname, 'node_modules/vue/dist/vue.esm.js');

build({
    entryPoints: ['main.js'], // Update this to your entry point
    bundle: true,
    outfile: 'bundle.js',
    format: 'esm',
    plugins: [
        {
            name: 'alias-vue',
            setup(build) {
                build.onResolve({ filter: /^vue$/ }, () => {
                    return { path: vuePath };
                });
            },
        },
    ],
}).catch(() => process.exit(1));
