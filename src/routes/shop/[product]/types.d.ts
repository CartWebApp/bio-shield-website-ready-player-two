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
	products: {
		['bio-shield-bracelet']: typeof import('..\\(products)\\bio-shield-bracelet.js').default;
		['bio-shield-bundle']: typeof import('..\\(products)\\bio-shield-bundle.js').default;
		['bio-shield-salve']: typeof import('..\\(products)\\bio-shield-salve.js').default;
		['bio-shield-spray']: typeof import('..\\(products)\\bio-shield-spray.js').default;
	};
}, Awaited<ReturnType<typeof import('.\\+load.js').default>>, Awaited<ReturnType<typeof import('..\\+load.js').default>>]>;
// @ts-ignore
declare module '#server' {
	export function useContext(): Context;
	export function useContext<K extends keyof Context>(key: K): Context[K];
	// @ts-ignore
	export function useParams<K extends keyof Params>(param: K): Params[K];
	// @ts-ignore
	export function useParams(): Params;
	// @ts-ignore
	export function getRequest(): Request;
}
declare global {
	export function useContext<K extends keyof Context>(key: K): Context[K];
	export function useContext(): Context;
	export function useParams<K extends keyof Params>(key: K): Params[K];
	export function useParams(): Params;
}
export interface Params {
	readonly product: string;
}
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
