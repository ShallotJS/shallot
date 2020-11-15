import * as ShallotAWS from './core';
import HTTPJSONBodyParser from './middlewares/http-json-body-parser';
import HTTPCors from './middlewares/http-cors';
import HTTPErrorHandler from './middlewares/http-error-handler';

export { ShallotAWS, HTTPJSONBodyParser, HTTPCors, HTTPErrorHandler };
export default ShallotAWS.default;
