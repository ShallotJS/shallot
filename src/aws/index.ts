import * as ShallotAWS from './core';
import HTTPJSONBodyParser from './middlewares/http-json-body-parser';
import HTTPCors from './middlewares/http-cors';
import HTTPErrorHandler from './middlewares/http-error-handler';
import DoNotWaitForEmptyEventLoop from './middlewares/do-not-wait-for-empty-event-loop';

export {
  ShallotAWS,
  HTTPJSONBodyParser,
  HTTPCors,
  HTTPErrorHandler,
  DoNotWaitForEmptyEventLoop,
};
export default ShallotAWS.default;
