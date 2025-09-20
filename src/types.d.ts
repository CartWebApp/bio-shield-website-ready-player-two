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
