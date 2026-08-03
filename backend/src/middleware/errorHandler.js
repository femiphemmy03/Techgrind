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
  const message = statusCode < 500 ? err.message : 'Something went wrong. Please try again.';

  if (statusCode >= 500) {
    if (err.isAxiosError) {
      console.error('[error] Upstream API call failed:', {
        url: err.config?.url,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
    } else {
      console.error('[error]', err.stack || err.message || err);
    }
  }

  res.status(statusCode).json({ error: message });
}
