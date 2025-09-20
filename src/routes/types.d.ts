import type { __Request, __LoadFunction, __MergeContext } from '#__types';
export {};
// @ts-ignore
declare module '#server' {
	export function useContext(): Context;
	// @ts-ignore
	export function useParams(): Params;
}
export type Context = __MergeContext<[{}]>;
declare global {
	export function useContext(): Context;
	export function useParams(): Params;
}
export interface Params {}
export type Request = __Request<Params>;
export type LoadFunction<T extends {} | null | void> = __LoadFunction<Request, T>;
