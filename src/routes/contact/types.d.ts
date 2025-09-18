export {};
declare global {
	interface Context {
	};
	export function useContext<K extends keyof Context>(key: K): Context[K];
	export function useContext(): Context;
	interface Params {
	};
	export function useParams<P extends keyof Params>(param: P): Params[P];
	export function useParams(): Params;
};