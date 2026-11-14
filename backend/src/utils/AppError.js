/** An error with an HTTP status and a stable code. Your error handler in app.js already reads both. */
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}