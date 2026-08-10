import "express-serve-static-core";

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      githubLogin: string;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
