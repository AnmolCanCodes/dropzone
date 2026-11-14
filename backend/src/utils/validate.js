import { AppError } from './AppError.js';

export function parseOrThrow(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.') || 'body';
    throw new AppError(400, 'VALIDATION_ERROR', `${field}: ${issue.message}`);
  }
  return result.data;
}