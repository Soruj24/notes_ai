/** Domain errors. Repositories/services throw these; handlers map to HTTP. */

export class NotFoundError extends Error {
  readonly status = 404;
  readonly code = "NOT_FOUND";
}

export class ForbiddenError extends Error {
  readonly status = 403;
  readonly code = "FORBIDDEN";
}

export class ConflictError extends Error {
  readonly status = 409;
  readonly code = "CONFLICT";
}

export class ValidationError extends Error {
  readonly status = 400;
  readonly code = "VALIDATION";
  readonly fields: Record<string, string[]>;

  constructor(fields: Record<string, string[]>) {
    super("Validation failed.");
    this.fields = fields;
  }
}

export type DbError =
  | NotFoundError
  | ForbiddenError
  | ConflictError
  | ValidationError;

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

/** Map any thrown value to an HTTP status + field-error payload. */
export function toHttpError(err: unknown): {
  status: number;
  body: { error?: string; errors?: Record<string, string[]> };
} {
  if (err instanceof ValidationError)
    return { status: 400, body: { errors: err.fields } };
  if (err instanceof NotFoundError)
    return { status: 404, body: { error: err.message } };
  if (err instanceof ForbiddenError)
    return { status: 403, body: { error: err.message } };
  if (err instanceof ConflictError)
    return { status: 409, body: { error: err.message } };
  return { status: 500, body: { error: "Something went wrong." } };
}
