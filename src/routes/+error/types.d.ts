export {};
declare global {
	interface Context {
		error: {
			message: string;
			status: number;
		};
	};
	export function useContext<K extends keyof Context>(key: K): Context[K];
	export function useContext(): Context;
	interface Params {};
	export function useParams(): Params;
};