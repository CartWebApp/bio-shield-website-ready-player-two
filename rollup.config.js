/** @import { RollupOptions } from 'rollup' */
import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
/** @type {RollupOptions} */
export default {
    input: 'src/server/remote/client.js',
    output: {
        file: 'src/server/remote/bundle.js'
    },
    treeshake: true,
    // @ts-expect-error i have no idea why this fails
    plugins: [nodeResolve(), terser()]
};
