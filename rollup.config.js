import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
export default /** @type {import('rollup').RollupOptions} */ ({
	input: 'src/server/client.js',
	output: {
		file: 'bundle.js',
	},
    treeshake: true,
    plugins: [nodeResolve(), terser()]
});