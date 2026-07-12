export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>) {
    super("VALIDATION_FAILED", "Invalid request body", 400, { fields });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}

export class AuthError extends AppError {
  constructor(code: string, message: string, status: number = 401, details?: Record<string, unknown>) {
    super(code, message, status, details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 422, details);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 409, details);
  }
}

/**
 * Thrown when a slug lookup matches a company's slugHistory instead of
 * its current slug. Consumers catch this to issue a 301/308 redirect.
 * Extends Error (NOT AppError) to avoid being caught by handleApiError.
 */
export class SlugRedirectError extends Error {
  constructor(
    public kind: string,
    public newSlug: string,
  ) {
    super(`Slug redirect: ${kind}/${newSlug}`);
    this.name = "SlugRedirectError";
  }
}
