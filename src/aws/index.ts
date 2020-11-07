import type { Callback, Context, Handler } from 'aws-lambda';

interface ShallotMiddlewareHandler {
  (handler: ShallotHandler): Promise<void>;
}
interface ShallotMiddleware<TOptions = Record<string, unknown>> {
  (options?: TOptions): void;
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
  __error: Error;
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
        middlewareFunction(this);
      });

      handler(this.event, this.context, this.callback);

      this.__middlewares.after.forEach((middlewareFunction) => {
        middlewareFunction(this);
      });
    } catch (error1) {
      try {
        this.__error = error1;
        this.__middlewares.onError.forEach((middlewareFunction) => {
          middlewareFunction(this);
        });
      } catch (error2) {
        this.__error = error2;
      }
    }

    this.__middlewares.finally.forEach((middlewareFunction) => {
      middlewareFunction(this);
    });

    return this;
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
