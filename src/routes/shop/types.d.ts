import type { __Request, __LoadFunction, __IntersectNonNull } from '#__types';
export {};
type Context = __IntersectNonNull<[{
	products: {
		['bio-shield-spray']: typeof import('./(products)/bio-shield-spray.js').default;
	};
}]>
// @ts-ignore
declare module '#server' {
	export function useContext(): Context;
	export function useContext<K extends keyof Context>(key: K): Context[K];
}
declare global {
	export function useContext<K extends keyof Context>(key: K): Context[K];
	export function useContext(): Context;
	export function useParams(): Params;
}
interface Params {}
export type Request = __Request<Params>;
export type LoadFunction<T extends {} | null | void> = __LoadFunction<Request, T>;
