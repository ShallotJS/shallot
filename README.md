# 🚨 Work in Progress 🚨

# Shallot

A middleware framework for serverless functions written in TypeScript or JavaScript.

Inspired by [Express.js](http://expressjs.com/) and [Middy.js](https://middy.js.org/)

### Benefits over middy

- First class support for TypeScript
- Simpler codebase
- Mildly faster execution

### Drawbacks from middy

- Only supports promise based handlers/middleware with async/await
  \*\*This is an intentional decision to allow for the simplified codebase and faster execution

## Installation

Add shallot to your project

```
npm install --save shallot
```

TypeScript support is out of the box so you do not need an additional types module.

## Usage

Basic JavaScript example:

```javascript
import { ShallotAWS } from 'shallot';

import { jsonBodyParser, databaseConnector, httpErrorHandler } from '<your middlewares>';

const _handler = async (event, context) => {
  // Your handler code here
};

export const handler = ShallotAWS(handler)
  .use(jsonBodyParser())
  .use(databaseConnector())
  .use(httpErrorHandler());
```

## How it Works

![Middleware onion](https://middy.js.org/img/middy-middleware-engine.png)
\*\*Artwork credit: [Middy.js](https://middy.js.org/)

Middlewares are applied as layers that can execute before and after. This loosely
can be analogized to an onion (and Serverless starts with an S) hence the name Shallot.

The middlewares can modify the request context, response, or handle exceptions thrown during runtime
to take care of common tasks. Canonical use cases include establishing database connections, parsing
request bodies from json, and authenticating users.

## Official Middlewares

### http-json-body-parser

Shallot middleware that parses and replaces the JSON body of HTTP request bodies.
Requires the Content-Type header to be properly set.

```javascript
import { HTTPJSONBodyParser } from 'shallot/dist/aws';
```

### http-cors

Shallot middleware that handles the setting of response CORS headers according
to the MSDN spec. https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

```javascript
import { HTTPCors } from 'shallot/dist/aws';
```

### http-error-handler

Shallot middleware that catches "HTTP Errors" thrown by the
http-errors npm module and returns the corresponding status
code in the response.

```javascript
import { HTTPErrorHandler } from 'shallot/dist/aws';
```

### do-not-wait-for-empty-event-loop

Shallot middleware that disables the AWS Lambda
event loop.

```javascript
import { DoNotWaitForEmptyEventLoop } from 'shallot/dist/aws';
```

## Creating a Custom Middleware

A middleware is an object that defines any of a `before`, `after`, `onError`, or `finally` block.

- before: executes before the handler
- after: executes after the handler
- onError: executes in case of exception
- finally: executes after either the `after` or `onError` stage

\*\*If an error is thrown at any point, execution of all other middlewares/the handler is terminated
and the onError middlewares + finally middlewares execute instead.

```javascript
const middleware = {
  before: async (request) => {
    console.log(request);
  },
};

ShallotAWS(handler).use(middleware);
```

You may also want to pass config options to the middleware which you can do by exporting your
middleware as a function instead of an object.

```javascript
const middlewareWithOptions = (config) => ({
  before: async (request) => {
    if (config.shouldLog) {
      console.log(request);
    }
  },
});

const config = {
  shouldLog: true,
};

ShallotAWS(handler).use(middlewareWithOptions(config));
```

### The request object

The request object passed to each middleware at runtime has the following properties.

```javascript
{
  event, // The lambda event object
  context, // The lambda runtime context object
  response, // The user-defined response
  error, // Error object set before calling onError middlewares
}
```
