import type { NextFunction, Request, RequestHandler, Response } from "express";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export function badRequest(message: string, code = "BAD_REQUEST"): AppError {
  return new AppError(400, code, message);
}

export function notFound(message: string, code = "NOT_FOUND"): AppError {
  return new AppError(404, code, message);
}
