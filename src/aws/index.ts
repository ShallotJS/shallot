import * as ShallotAWS from './core';
import HTTPJSONBodyParser from './middlewares/http-json-body-parser';
import HTTPCors from './middlewares/http-cors';
import HTTPErrorHandler from './middlewares/http-error-handler';
import DoNotWaitForEmptyEventLoop from './middlewares/do-not-wait-for-empty-event-loop';
import Validator from './middlewares/validator';
export * from './wrappers/authorizer';
export * from './wrappers/rest';
export * from './wrappers/websocket';

export {
  ShallotAWS,
  HTTPJSONBodyParser,
  HTTPCors,
  HTTPErrorHandler,
  DoNotWaitForEmptyEventLoop,
  Validator,
};
export default ShallotAWS.default;
