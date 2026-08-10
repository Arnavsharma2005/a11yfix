import type { RequestHandler } from "express";
import "express-session";
import { prisma } from "../db/client";
import { AppError, asyncHandler } from "../utils/errors";
import { config } from "../config";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    githubLogin?: string;
    oauthState?: string;
  }
}

const DEV_GITHUB_ID = "a11yfix-local-dev";

export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  if (req.session.userId) {
    req.user = {
      id: req.session.userId,
      githubLogin: req.session.githubLogin ?? "unknown"
    };
    next();
    return;
  }

  if (!config.devBypassAuth) {
    throw new AppError(401, "UNAUTHENTICATED", "Sign in with GitHub to continue.");
  }

  const user = await prisma.user.upsert({
    where: { githubId: DEV_GITHUB_ID },
    update: {},
    create: {
      githubId: DEV_GITHUB_ID,
      githubLogin: "local-dev",
      accessToken: ""
    }
  });

  req.session.userId = user.id;
  req.session.githubLogin = user.githubLogin;
  req.user = {
    id: user.id,
    githubLogin: user.githubLogin
  };

  next();
});
