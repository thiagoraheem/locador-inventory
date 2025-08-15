import type { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Middleware factory for validating request data using Zod schemas.
 * @param schema Zod schema to validate against
 * @param property Request property to validate (defaults to body)
 */
export function validate(
  schema: AnyZodObject,
  property: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse((req as any)[property]);
      (req as any)[property] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: err.errors,
        });
      }
      next(err);
    }
  };
}
