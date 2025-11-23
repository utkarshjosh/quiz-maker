import util from 'util';
import { type NextFunction, type Request, type Response } from 'express';
import { HttpStatusCode } from 'axios';
import { type ApiError } from '@/lib/errors';
import logger from '@/lib/logger';
import environment from '@/lib/environment';

interface ErrorBody {
  success: false;
  message: string;
  rawErrors?: string[];
  stack?: string;
}

const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Enhanced logging for OAuth callback errors
  const errorContext = {
    url: req.url,
    method: req.method,
    message: err.message,
    statusCode: err.statusCode,
    headers: req.headers,
    params: req.params,
    query: req.query,
    // Don't log body for security reasons (may contain tokens)
  };

  console.error('❌ Express Error Handler:', errorContext);
  
  logger.error(`Request Error:
        \nError:\n${JSON.stringify(err)}
        \nURL:\n${req.method} ${req.url}
        \nHeaders:\n${util.inspect(req.headers)}
        \nParams:\n${util.inspect(req.params)}
        \nQuery:\n${util.inspect(req.query)}
        \nBody:\n${util.inspect(req.body)}`);

  const status: number = err.statusCode ?? HttpStatusCode.InternalServerError;
  const errorBody: ErrorBody = {
    success: false,
    message: err.message,
    rawErrors: err.rawErrors,
  };

  if (environment.isDev()) {
    errorBody.stack = err.stack;
  }

  // Prevent sending response if headers already sent
  if (res.headersSent) {
    console.error('⚠️ Headers already sent, passing to default error handler');
    return next(err);
  }

  res.status(status).send(errorBody);
};

export default errorHandler;
