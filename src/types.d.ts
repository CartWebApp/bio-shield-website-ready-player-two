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
type Prettify<T> = {
    [K in keyof T]: T[K];
}
type ___IntersectNonNull<
    T extends Array<null | void | {}>,
    Acc = null
> = T extends [infer First, ...infer Rest extends Array<null | void | {}>]
    ? ___IntersectNonNull<
          Rest,
          First extends {}
              ? Acc extends null
                  ? First
                  : First & Acc
              : Acc extends null
              ? {}
              : Acc
      >
    : Acc;

export type __IntersectNonNull<T extends Array<null | {} | void>> = {
    [K in keyof ___IntersectNonNull<T>]: ___IntersectNonNull<T>[K];
};
