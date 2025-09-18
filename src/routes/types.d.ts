export {};
declare global {
	interface Context {
	};
	export function useContext<K extends keyof Context>(key: K): Context[K];
	export function useContext(): Context;
};