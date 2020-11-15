import * as ShallotAWS from './core';
import HTTPJSONBodyParser from './middlewares/http-json-body-parser';
import HTTPCors from './middlewares/http-cors';

export { ShallotAWS, HTTPJSONBodyParser, HTTPCors };
export default ShallotAWS.default;
