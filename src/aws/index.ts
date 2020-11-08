import type { Callback, Context, Handler } from 'aws-lambda';

type TCallback = Callback<unknown>;

type UnknownObject = Record<string | number | symbol, unknown> | string;

interface ShallotRequest<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  event: TEvent;
  context: Context;
  response?: TResult | void;
  error?: Error;
}

export interface ShallotMiddlewareHandler<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  (request: ShallotRequest<TEvent, TResult>): Promise<void>;
}

export interface ShallotMiddleware<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  before?: ShallotMiddlewareHandler<TEvent, TResult>;
  after?: ShallotMiddlewareHandler<TEvent, TResult>;
  onError?: ShallotMiddlewareHandler<TEvent, TResult>;
  finally?: ShallotMiddlewareHandler<TEvent, TResult>;
}

export interface ShallotMiddlewareWithOptions<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject,
  TConfig extends UnknownObject = UnknownObject
> {
  (options?: TConfig): ShallotMiddleware<TEvent, TResult>;
}

export interface ShallotHandler<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> extends Handler<TEvent, TResult> {
  (event: TEvent, context: Context, callback: TCallback): Promise<TResult>;
  use: (
    middleware: ShallotMiddleware<TEvent, TResult>
  ) => ShallotHandler<TEvent, TResult>;
}

const executeMiddlewaresInChain = async <
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
>(
  request: ShallotRequest<TEvent, TResult>,
  middlewares: ShallotMiddlewareHandler<TEvent, TResult>[]
): Promise<void> => {
  for (const middleware of middlewares) {
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
function ShallotAWS<TEvent = unknown, TResult extends UnknownObject = UnknownObject>(
  handler: Handler<TEvent, TResult>
): ShallotHandler<TEvent, TResult> {
  const middlewares: {
    before: ShallotMiddlewareHandler<TEvent, TResult>[];
    after: ShallotMiddlewareHandler<TEvent, TResult>[];
    onError: ShallotMiddlewareHandler<TEvent, TResult>[];
    finally: ShallotMiddlewareHandler<TEvent, TResult>[];
  } = {
    before: [],
    after: [],
    onError: [],
    finally: [],
  };

  const shallotHandler = async (event: TEvent, context: Context, callback: TCallback) => {
    const request: ShallotRequest<TEvent, TResult> = {
      event,
      context,
      response: undefined,
      error: undefined,
    };

    try {
      await executeMiddlewaresInChain<TEvent, TResult>(request, middlewares.before);

      request.response = await handler(request.event, request.context, callback);

      await executeMiddlewaresInChain<TEvent, TResult>(request, middlewares.after);
    } catch (error) {
      try {
        request.error = error;
        await executeMiddlewaresInChain<TEvent, TResult>(request, middlewares.onError);
      } catch (_) {
        return request.error;
      }
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
  shallotHandler.use = (middleware: ShallotMiddleware) => {
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

    return shallotHandler;
  };

  return shallotHandler as ShallotHandler<TEvent, TResult>;
}

export default ShallotAWS;
