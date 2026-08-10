import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../utils/errors";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
    return;
  }

  const message = process.env.NODE_ENV === "production" ? "Internal server error" : err.message;
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message
    }
  });
};
