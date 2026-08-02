/** Wraps an async route handler so thrown errors reach the error middleware instead of crashing the process. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // Never leak stack traces, SQL fragments, or internal details to the client.
  const message = statusCode < 500 ? err.message : 'Something went wrong. Please try again.';

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({ error: message });
}
