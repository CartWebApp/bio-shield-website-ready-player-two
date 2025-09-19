import type { __Request, __LoadFunction, __IntersectNonNull } from '#__types';
export {};
type Context = __IntersectNonNull<[{
	products: {
		['bio-shield-spray']: typeof import('../(products)/bio-shield-spray.js').default;
	};
}, Awaited<ReturnType<typeof import('./+load.js').default>>]>;
// @ts-ignore
declare module '#server' {
	export function useContext(): Context;
	export function useContext<K extends keyof Context>(key: K): Context[K];
	// @ts-ignore
	export function useParams<K extends keyof Params>(param: K): Params[K];
	// @ts-ignore
	export function useParams(): Params;
}
declare global {
	export function useContext<K extends keyof Context>(key: K): Context[K];
	export function useContext(): Context;
	export function useParams<K extends keyof Params>(key: K): Params[K];
	export function useParams(): Params;
}
interface Params {
	product: string;
}
export type Request = __Request<Params>;
export type LoadFunction<T extends {} | null | void> = __LoadFunction<Request, T>;
