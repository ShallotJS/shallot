import type { Callback, Context, Handler } from 'aws-lambda';

interface ShallotRequest {
  event: unknown;
  context: Context;
  callback: Callback<unknown>;
  response: unknown;
  error?: Error;
}

interface ShallotMiddlewareHandler {
  (request: ShallotRequest): Promise<void>;
}

interface ShallotMiddleware<TOptions = Record<string, unknown>> {
  (options?: TOptions): void;
  before?: ShallotMiddlewareHandler;
  after?: ShallotMiddlewareHandler;
  onError?: ShallotMiddlewareHandler;
  finally?: ShallotMiddlewareHandler;
}

interface ShallotHandler extends Handler {
  (event: unknown, context: Context, callback: unknown): Promise<any>;
  use: <TOptions = Record<string, unknown>>(
    middleware: ShallotMiddleware<TOptions>
  ) => ShallotHandler;
  __middlewares: {
    before: ShallotMiddlewareHandler[];
    after: ShallotMiddlewareHandler[];
    onError: ShallotMiddlewareHandler[];
    finally: ShallotMiddlewareHandler[];
  };
}

const executeMiddlewaresInChain = async (
  request: ShallotRequest,
  middlewares: ShallotMiddlewareHandler[]
): Promise<void> => {
  for (const middleware of middlewares) {
    try {
      await middleware(request);
    } catch (err) {
      throw new Error('UNIMPLEMENTED');
    }
  }
};

function ShallotAWS(handler: Handler): ShallotHandler {
  async function shallotHandler(
    this: ShallotHandler,
    event: unknown,
    context: Context,
    callback: Callback<unknown>
  ) {
    const request: ShallotRequest = {
      event,
      context,
      callback,
      response: null,
      error: undefined,
    };

    try {
      await executeMiddlewaresInChain(request, this.__middlewares.before);

      request.response = await handler.call(
        request,
        request.event,
        request.context,
        request.callback
      );

      await executeMiddlewaresInChain(request, this.__middlewares.after);
    } catch (error1) {
      try {
        request.error = error1;
        await executeMiddlewaresInChain(request, this.__middlewares.onError);
      } catch (error2) {
        request.error = error2;
      }
    }

    await executeMiddlewaresInChain(request, this.__middlewares.finally);

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

  return shallotHandler as ShallotHandler;
}

export default ShallotAWS;
