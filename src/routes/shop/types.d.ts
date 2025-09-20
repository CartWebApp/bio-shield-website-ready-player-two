import type { __Request, __LoadFunction, __MergeContext } from '#__types';
export {};
type Context = __MergeContext<[{
	products: {
		['bio-shield-bracelet']: typeof import('.\\(products)\\bio-shield-bracelet.js').default;
		['bio-shield-salve']: typeof import('.\\(products)\\bio-shield-salve.js').default;
		['bio-shield-spray']: typeof import('.\\(products)\\bio-shield-spray.js').default;
	};
}]>;
// @ts-ignore
declare module '#server' {
	export function useContext(): Context;
	export function useContext<K extends keyof Context>(key: K): Context[K];
	// @ts-ignore
	export function useParams(): Params;
}
declare global {
	export function useContext<K extends keyof Context>(key: K): Context[K];
	export function useContext(): Context;
	export function useParams(): Params;
}
interface Params {}
export type Request = __Request<Params>;
export type LoadFunction<T extends {} | null | void> = __LoadFunction<Request, T>;
