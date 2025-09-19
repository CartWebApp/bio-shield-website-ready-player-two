export {};
declare global {
	interface Context {
		products: {
			['bio-shield-spray']: typeof import('./(products)/bio-shield-spray.js').default;
		};
	};
	export function useContext<K extends keyof Context>(key: K): Context[K];
	export function useContext(): Context;
	interface Params {};
	export function useParams(): Params;
};