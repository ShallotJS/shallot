import type { Callback, Context, Handler } from 'aws-lambda';

type TCallback = Callback<unknown>;

type UnknownObject = Record<string | number | symbol, unknown>;

interface ShallotRequest<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  event: TEvent;
  context: Context;
  callback: TCallback;
  response?: TResult | void;
  error?: Error;
}

interface ShallotMiddlewareHandler<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject
> {
  (request: ShallotRequest<TEvent, TResult>): Promise<void>;
}

interface ShallotMiddleware<
  TEvent = unknown,
  TResult extends UnknownObject = UnknownObject,
  TConfig extends UnknownObject = UnknownObject
> {
  (options?: TConfig): void;
  before?: ShallotMiddlewareHandler<TEvent, TResult>;
  after?: ShallotMiddlewareHandler<TEvent, TResult>;
  onError?: ShallotMiddlewareHandler<TEvent, TResult>;
  finally?: ShallotMiddlewareHandler<TEvent, TResult>;
}

interface ShallotHandler<TEvent = unknown, TResult extends UnknownObject = UnknownObject>
  extends Handler<TEvent, TResult> {
  (event: TEvent, context: Context, callback: TCallback): Promise<TResult>;
  use: <TConfig extends UnknownObject>(
    middleware: ShallotMiddleware<TEvent, TResult, TConfig>
  ) => ShallotHandler<TEvent, TResult>;
  __middlewares: {
    before: ShallotMiddlewareHandler<TEvent, TResult>[];
    after: ShallotMiddlewareHandler<TEvent, TResult>[];
    onError: ShallotMiddlewareHandler<TEvent, TResult>[];
    finally: ShallotMiddlewareHandler<TEvent, TResult>[];
  };
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

function ShallotAWS<TEvent = unknown, TResult extends UnknownObject = UnknownObject>(
  handler: Handler<TEvent, TResult>
): ShallotHandler<TEvent, TResult> {
  async function shallotHandler(
    this: ShallotHandler<TEvent, TResult>,
    event: TEvent,
    context: Context,
    callback: TCallback
  ) {
    const request: ShallotRequest<TEvent, TResult> = {
      event,
      context,
      callback,
      response: undefined,
      error: undefined,
    };

    try {
      await executeMiddlewaresInChain<TEvent, TResult>(
        request,
        this.__middlewares.before
      );

      request.response = await handler(request.event, request.context, request.callback);

      await executeMiddlewaresInChain<TEvent, TResult>(request, this.__middlewares.after);
    } catch (error) {
      try {
        request.error = error;
        await executeMiddlewaresInChain<TEvent, TResult>(
          request,
          this.__middlewares.onError
        );
      } catch (_) {
        return request.response;
      }
    }

    await executeMiddlewaresInChain<TEvent, TResult>(request, this.__middlewares.finally);

    return request.response;
  }

  shallotHandler.__middlewares = {
    before: [],
    after: [],
    onError: [],
    finally: [],
  } as ShallotHandler['__middlewares'];

  shallotHandler.use = (middleware: ShallotMiddleware) => {
    if (middleware.before != null) {
      shallotHandler.__middlewares.before.push(middleware.before);
    }

    // after middlewares execute in reverse order
    if (middleware.after != null) {
      shallotHandler.__middlewares.after.unshift(middleware.after);
    }

    if (middleware.onError != null) {
      shallotHandler.__middlewares.after.push(middleware.onError);
    }

    if (middleware.finally != null) {
      shallotHandler.__middlewares.after.push(middleware.finally);
    }

    return shallotHandler;
  };

  return shallotHandler as ShallotHandler<TEvent, TResult>;
}

export default ShallotAWS;
