import type { Request } from 'express';
import type { OutgoingHttpHeaders } from 'http';

/** @internal */
export interface __Request<Params extends {}> {
    path: string;
    params: Params;
    request: Request;
    setHeaders(headers: OutgoingHttpHeaders): void;
}

/** @internal */
export type __LoadFunction<Request, T extends {} | null | void> = (
    request: Request
) => T | Promise<T>;

type ___IntersectNonNull<
    T extends Array<null | void | {}>,
    Acc = null
> = T extends [infer First, ...infer Rest extends Array<null | void | {}>]
    ? ___IntersectNonNull<
          Rest,
          First extends {}
              ? Acc extends {}
                  ? First & Acc
                  : First
              : Acc extends {}
              ? Acc
              : {}
      >
    : Acc extends {}
    ? Acc
    : {};

/** @internal */
export type __MergeContext<T extends Array<null | {} | void>> = {
    readonly [K in keyof ___IntersectNonNull<T>]: ___IntersectNonNull<T>[K];
};

/** @internal */
export interface __RemoteFunctionRequestBody {
    argument: string;
    queries?: Array<{
        id: number;
        argument: string;
    }>;
}

/** @internal */
export interface __RemoteFunctionResponseBody {
    success: boolean;
    result: string;
    error: string;
    queries?: Array<{
        id: number;
        argument: string;
        success: boolean;
        result: string;
        error: string;
    }>;
}

export type RemoteResource<T> = Omit<Promise<Awaited<T>>, symbol> &
    Readonly<
        {
            error: any;
            loading: boolean;
        } & (
            | {
                  current: undefined;
                  ready: false;
              }
            | {
                  current: Awaited<T>;
                  ready: true;
              }
        )
    >;

type RemoteQuery<T> = RemoteResource<T> & {
    /**
     * On the client, this sets the `query`'s value without refetching.
     * On the server, this can be used in a `command` to set the `query`'s value on the client.
     */
    set(value: T): void;
    /**
     * On the client, this refetches the `query` from the server. 
     * On the server, this can be used in a `command` to update the `query`'s value on the client.
     */
    refresh(): Promise<void>;
    /**
     * Can be used to set a temporary value on the client until the `query` is updated.
     */
    withOverride(
        update: (current: Awaited<T>) => Awaited<T>
    ): RemoteQueryOverride;
};

export interface RemoteQueryOverride {
    /**
     * Reverts the `query`'s value to the value before it was overridden.
     */
    release(): void;
}

export type RemoteCommand<Input, Output> = {
    (arg: Input): Omit<Promise<Awaited<Output>>, symbol> & {
        /**
         * Can be used to update multiple `query`s at once. 
         * When this is called, the `queries` passed will be sent to the
         * server along with the `command`'s argument to update both the 
         * queries and the command in a single flight. 
         */
        updates(
            ...queries: Array<RemoteQuery<any> | RemoteQueryOverride>
        ): Promise<Awaited<Output>>;
    };
    readonly pending: number;
};

export type RemoteQueryFunction<T extends (arg?: any) => MaybePromise<any>> =
    Parameters<T>['length'] extends 0
        ? () => RemoteQuery<ReturnType<T>>
        : (arg: Parameters<T>['0']) => RemoteQuery<ReturnType<T>>;

export type MaybePromise<T> = Promise<T> | T;
