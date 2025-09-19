import type { __Request, __LoadFunction, __IntersectNonNull } from '#__types';
export {};
// @ts-ignore
declare module '#server' {
	export function useContext(): Context;
}
type Context = __IntersectNonNull<[{}]>;
declare global {
	export function useContext(): Context;
	export function useParams(): Params;
}
interface Params {}
export type Request = __Request<Params>;
export type LoadFunction<T extends {} | null | void> = __LoadFunction<Request, T>;
