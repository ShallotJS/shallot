import type { Callback, Context, Handler } from 'aws-lambda';

interface ShallotMiddlewareHandler {
  (handler: ShallotHandler, context: unknown): Promise<void>;
}
interface ShallotMiddleware<TOptions = Record<string, unknown>> {
  (handler: ShallotHandler, options?: TOptions): void;
  before?: ShallotMiddlewareHandler;
  after?: ShallotMiddlewareHandler;
  onError?: ShallotMiddlewareHandler;
  finally?: ShallotMiddlewareHandler;
}

interface ShallotHandler extends Handler {
  (event: unknown, context: Context, callback: unknown): ShallotHandler;
  use: <TOptions = Record<string, unknown>>(
    middleware: ShallotMiddleware<TOptions>
  ) => ShallotHandler;
  __middlewares: {
    before: ShallotMiddlewareHandler[];
    after: ShallotMiddlewareHandler[];
    onError: ShallotMiddlewareHandler[];
    finally: ShallotMiddlewareHandler[];
  };
  error: Error;
  event: unknown;
  context: Context;
  callback: Callback<unknown>;
}

function ShallotAWS(handler: Handler): ShallotHandler {
  function shallotHandler(
    this: ShallotHandler,
    event: unknown,
    context: Context,
    callback: Callback<unknown>
  ): ShallotHandler {
    this.event = event;
    this.context = context;
    this.callback = callback;
    try {
      this.__middlewares.before.forEach((middlewareFunction) => {
        middlewareFunction(this, context);
      });

      handler(this.event, this.context, this.callback);

      this.__middlewares.after.forEach((middlewareFunction) => {
        middlewareFunction(this, context);
      });
    } catch (error) {
      this.error = error;
      this.__middlewares.onError.forEach((middlewareFunction) => {
        middlewareFunction(this, context);
      });
    }

    this.__middlewares.finally.forEach((middlewareFunction) => {
      middlewareFunction(this, context);
    });

    return this;
  }

  shallotHandler.__middlewares = {
    before: [],
    after: [],
    onError: [],
    finally: [],
  } as ShallotHandler['__middlewares'];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
