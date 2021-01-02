import type { Callback, Context, Handler } from 'aws-lambda';
import type { HttpError } from 'http-errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnknownObject = Record<string | number | symbol, any> | string;

interface ShallotAWSRequest<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  event: TEvent;
  context: Context;
  response?: TResult | void;
  error?: Error | HttpError;
  /** If true, skips remaining onError middlewares. */
  __handledError?: boolean;
}

export interface ShallotAWSMiddlewareHandler<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  (request: ShallotAWSRequest<TEvent, TResult>): Promise<void>;
}

export interface ShallotAWSMiddleware<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  before?: ShallotAWSMiddlewareHandler<TEvent, TResult>;
  after?: ShallotAWSMiddlewareHandler<TEvent, TResult>;
  onError?: ShallotAWSMiddlewareHandler<TEvent, TResult>;
  finally?: ShallotAWSMiddlewareHandler<TEvent, TResult>;
}

export interface ShallotAWSMiddlewareWithOptions<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject,
  TConfig extends UnknownObject = UnknownObject
> {
  (options?: TConfig): ShallotAWSMiddleware<TEvent, TResult>;
}

export interface ShallotAWSHandler<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> extends Handler<TEvent, TResult> {
  (event: TEvent, context: Context, callback: Callback<TResult>): Promise<TResult>;
  use: (
    middleware: ShallotAWSMiddleware<TEvent, TResult>
  ) => ShallotAWSHandler<TEvent, TResult>;
}

const executeMiddlewaresInChain = async <
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
>(
  request: ShallotAWSRequest<TEvent, TResult>,
  middlewares: ShallotAWSMiddlewareHandler<TEvent, TResult>[]
): Promise<void> => {
  for (const middleware of middlewares) {
    await middleware(request);
  }
};

const executeErrorMiddlewaresInChain = async <
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
>(
  request: ShallotAWSRequest<TEvent, TResult>,
  middlewares: ShallotAWSMiddlewareHandler<TEvent, TResult>[]
): Promise<void> => {
  for (const middleware of middlewares) {
    if (request.__handledError) {
      break;
    }

    await middleware(request);
  }
};

/**
 * Shallot engine wrapper function for AWS Lambda handlers that
 * should be exported and called by lambda.
 *
 * Follows the builder pattern with a `use` function to apply
 * middlewares.
 *
 * @param handler the base lambda handler function
 * @return this, the wrapped handler.
 */
export function ShallotAWS<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
>(handler: Handler<TEvent, TResult>): ShallotAWSHandler<TEvent, TResult> {
  const middlewares: {
    before: ShallotAWSMiddlewareHandler<TEvent, TResult>[];
    after: ShallotAWSMiddlewareHandler<TEvent, TResult>[];
    onError: ShallotAWSMiddlewareHandler<TEvent, TResult>[];
    finally: ShallotAWSMiddlewareHandler<TEvent, TResult>[];
  } = {
    before: [],
    after: [],
    onError: [],
    finally: [],
  };

  const ShallotAWSHandler = async (
    event: TEvent,
    context: Context,
    callback: Callback<TResult>
  ) => {
    const request: ShallotAWSRequest<TEvent, TResult> = {
      event,
      context,
    };

    try {
      await executeMiddlewaresInChain<TEvent, TResult>(request, middlewares.before);

      request.response = await handler(request.event, request.context, callback);

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
  ShallotAWSHandler.use = (middleware: ShallotAWSMiddleware) => {
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

    return ShallotAWSHandler;
  };

  return ShallotAWSHandler as ShallotAWSHandler<TEvent, TResult>;
}

export default ShallotAWS;
