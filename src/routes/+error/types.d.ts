import type {
	__Request,
	__LoadFunction,
	__MergeContext,
	MaybePromise,
	RemoteQuery as _RemoteQuery,
	RemoteCommand as _RemoteCommand,
	RemoteQueryFunction as _RemoteQueryFunction,
	RemoteQueryOverride as _RemoteQueryOverride,
	RemoteResource as _RemoteResource
} from '#__types';

export type Context = __MergeContext<[{
	error: {
		message: string;
		status: number;
	};
}]>;
// @ts-ignore
declare module '#server' {
	export function useContext(): Context;
	export function useContext<K extends keyof Context>(key: K): Context[K];
	// @ts-ignore
	export function useParams(): Params;
	// @ts-ignore
	export function getRequest(): Request;
}
declare global {
	export function useContext<K extends keyof Context>(key: K): Context[K];
	export function useContext(): Context;
	export function useParams(): Params;
}
export interface Params {}
export type Request = __Request<Params>;
export type LoadFunction<T extends {} | null | void> = __LoadFunction<Request, T>;

// @ts-ignore
declare module '#remote' {
    // @ts-ignore
    export type RemoteQuery<T> = _RemoteQuery<T>;
    // @ts-ignore
    export type RemoteCommand<Input, Output> = _RemoteCommand<Input, Output>;
    // @ts-ignore
    export type RemoteQueryFunction<T extends (arg?: any) => MaybePromise<any>> = _RemoteQueryFunction<T>;
    // @ts-ignore
    export type RemoteQueryOverride = _RemoteQueryOverride;
    // @ts-ignore
    export type RemoteResource<T> = _RemoteResource<T>;
}
