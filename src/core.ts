import type { HttpError } from 'http-errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnknownObject = Record<string | number | symbol, any> | string;

interface ShallotCoreRequest<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  event: TEvent;
  response?: TResult | void;
  error?: Error | HttpError;
  /** If true, skips remaining onError middlewares. */
  __handledError?: boolean;
}

type Handler<TEvent = unknown, TResult = unknown> = (event: TEvent) => Promise<TResult>;

export interface ShallotCoreMiddlewareHandler<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  (request: ShallotCoreRequest<TEvent, TResult>): Promise<void>;
}

export interface ShallotCoreMiddleware<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  before?: ShallotCoreMiddlewareHandler<TEvent, TResult>;
  after?: ShallotCoreMiddlewareHandler<TEvent, TResult>;
  onError?: ShallotCoreMiddlewareHandler<TEvent, TResult>;
  finally?: ShallotCoreMiddlewareHandler<TEvent, TResult>;
}

export interface ShallotCoreMiddlewareWithOptions<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject,
  TConfig extends UnknownObject = UnknownObject
> {
  (options?: TConfig): ShallotCoreMiddleware<TEvent, TResult>;
}

export interface ShallotCoreHandler<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> extends Handler<TEvent> {
  (event: TEvent): Promise<TResult>;
  use: (
    middleware: ShallotCoreMiddleware<TEvent, TResult>
  ) => ShallotCoreHandler<TEvent, TResult>;
}

const executeMiddlewaresInChain = async <
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
>(
  request: ShallotCoreRequest<TEvent, TResult>,
  middlewares: ShallotCoreMiddlewareHandler<TEvent, TResult>[]
): Promise<void> => {
  for (const middleware of middlewares) {
    await middleware(request);
  }
};

const executeErrorMiddlewaresInChain = async <
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
>(
  request: ShallotCoreRequest<TEvent, TResult>,
  middlewares: ShallotCoreMiddlewareHandler<TEvent, TResult>[]
): Promise<void> => {
  for (const middleware of middlewares) {
    if (request.__handledError) {
      break;
    }

    await middleware(request);
  }
};

type ShallotCoreHandlerMiddlewares<TEvent, TResult> = {
  before: ShallotCoreMiddlewareHandler<TEvent, TResult>[];
  after: ShallotCoreMiddlewareHandler<TEvent, TResult>[];
  onError: ShallotCoreMiddlewareHandler<TEvent, TResult>[];
  finally: ShallotCoreMiddlewareHandler<TEvent, TResult>[];
};

const useMiddlewares = <TEvent, TResult>(
  middlewares: ShallotCoreHandlerMiddlewares<TEvent, TResult>,
  middleware: ShallotCoreMiddleware
): void => {
  if (middleware.before != null) {
    middlewares.before.push(middleware.before);
  }

  // after middlewares execute in reverse order
  if (middleware.after != null) {
    middlewares.after.unshift(middleware.after);
  }

  if (middleware.onError != null) {
    middlewares.onError.push(middleware.onError);
  }

  if (middleware.finally != null) {
    middlewares.finally.push(middleware.finally);
  }
};

/**
 * ShallotCore engine wrapper function for AWS Lambda handlers that
 * should be exported and called by lambda.
 *
 * Follows the builder pattern with a `use` function to apply
 * middlewares.
 *
 * @param handler the base lambda handler function
 * @return this, the wrapped handler.
 */
export function ShallotCore<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
>(handler: Handler<TEvent, TResult>): ShallotCoreHandler<TEvent, TResult> {
  const middlewares: ShallotCoreHandlerMiddlewares<TEvent, TResult> = {
    before: [],
    after: [],
    onError: [],
    finally: [],
  };

  const ShallotCoreHandler = async (event: TEvent) => {
    const request: ShallotCoreRequest<TEvent, TResult> = {
      event,
    };

    try {
      await executeMiddlewaresInChain<TEvent, TResult>(request, middlewares.before);

      request.response = await handler(request.event);

      await executeMiddlewaresInChain<TEvent, TResult>(request, middlewares.after);
    } catch (error) {
      request.error = error;
      await executeErrorMiddlewaresInChain<TEvent, TResult>(request, middlewares.onError);
    }

    await executeMiddlewaresInChain<TEvent, TResult>(request, middlewares.finally);

    return request.response;
  };

  /**
   * Applies a middleware to the engine that will execute during
   * runtime.
   *
   * Follows the builder pattern.
   *
   * @param middleware the middleware to apply
   * @return the handler with middleware applied
   */
  ShallotCoreHandler.use = (middleware: ShallotCoreMiddleware) => {
    useMiddlewares<TEvent, TResult>(middlewares, middleware);
    return ShallotCoreHandler;
  };

  return ShallotCoreHandler as ShallotCoreHandler<TEvent, TResult>;
}

export default ShallotCore;
