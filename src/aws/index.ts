import type { Handler } from 'aws-lambda';

interface ShallotMiddleware<TOptions = Record<string, unknown>> {
  (handler: ShallotHandler, options?: TOptions): void;
}

interface ShallotHandler extends Handler {
  (event: unknown, context: unknown, callback: unknown): ShallotHandler;
  use: <TOptions = Record<string, unknown>>(
    middleware: ShallotMiddleware<TOptions>
  ) => ShallotHandler;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ShallotAWS(_handler: Handler): ShallotHandler {
  function shallotHandler(
    this: ShallotHandler,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _event: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback: unknown
  ): ShallotHandler {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shallotHandler.use = (_middleware: ShallotMiddleware) => shallotHandler;

  return shallotHandler as ShallotHandler;
}

export default ShallotAWS;
