import type { AzureFunction as Handler, Context } from '@azure/functions';
import type { HttpError } from 'http-errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnknownObject = Record<string | number | symbol, any> | string;

interface ShallotRequest<TResult extends UnknownObject = UnknownObject> {
  context: Context;
  response?: TResult | void;
  error?: Error | HttpError;
}

export interface ShallotMiddlewareHandler<TResult extends UnknownObject = UnknownObject> {
  (request: ShallotRequest<TResult>): Promise<void>;
}

export interface ShallotMiddleware<TResult extends UnknownObject = UnknownObject> {
  before?: ShallotMiddlewareHandler<TResult>;
  after?: ShallotMiddlewareHandler<TResult>;
  onError?: ShallotMiddlewareHandler<TResult>;
  finally?: ShallotMiddlewareHandler<TResult>;
}

export interface ShallotMiddlewareWithOptions<
  TResult extends UnknownObject = UnknownObject,
  TConfig extends UnknownObject = UnknownObject
> {
  (options?: TConfig): ShallotMiddleware<TResult>;
}

export interface ShallotHandler<TResult extends UnknownObject = UnknownObject>
  extends Handler {
  (context: Context, ...args: unknown[]): Promise<TResult>;
  use: (middleware: ShallotMiddleware<TResult>) => ShallotHandler<TResult>;
}

const executeMiddlewaresInChain = async <TResult extends UnknownObject = UnknownObject>(
  request: ShallotRequest<TResult>,
  middlewares: ShallotMiddlewareHandler<TResult>[]
): Promise<void> => {
  for (const middleware of middlewares) {
    await middleware(request);
  }
};

/**
 * Shallot engine wrapper function for Azure function handlers that
 * should be exported and called by lambda.
 *
 * Follows the builder pattern with a `use` function to apply
 * middlewares.
 *
 * @param handler the base lambda handler function
 * @return this, the wrapped handler.
 */
function ShallotAZure<TResult extends UnknownObject = UnknownObject>(
  handler: Handler
): ShallotHandler<TResult> {
  const middlewares: {
    before: ShallotMiddlewareHandler<TResult>[];
    after: ShallotMiddlewareHandler<TResult>[];
    onError: ShallotMiddlewareHandler<TResult>[];
    finally: ShallotMiddlewareHandler<TResult>[];
  } = {
    before: [],
    after: [],
    onError: [],
    finally: [],
  };

  const shallotHandler = async (context: Context, ...args: unknown[]) => {
    const request: ShallotRequest<TResult> = {
      context,
      response: undefined,
      error: undefined,
    };

    try {
      await executeMiddlewaresInChain<TResult>(request, middlewares.before);

      request.response = await handler(request.context, ...args);

      await executeMiddlewaresInChain<TResult>(request, middlewares.after);
    } catch (error) {
      try {
        request.error = error;
        await executeMiddlewaresInChain<TResult>(request, middlewares.onError);
      } catch (_) {
        return request.error;
      }
    }

    await executeMiddlewaresInChain<TResult>(request, middlewares.finally);

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

  return shallotHandler as ShallotHandler<TResult>;
}

export default ShallotAzure;
