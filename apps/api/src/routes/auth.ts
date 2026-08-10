import crypto from "node:crypto";
import { Router, type Router as ExpressRouter } from "express";
import { Octokit } from "@octokit/rest";
import { prisma } from "../db/client";
import { config } from "../config";
import { encryptToken } from "../security/tokens";
import { AppError, asyncHandler } from "../utils/errors";

const router: ExpressRouter = Router();

router.get(
  "/github",
  asyncHandler(async (req, res) => {
    if (!config.githubClientId) {
      throw new AppError(500, "GITHUB_OAUTH_NOT_CONFIGURED", "GITHUB_CLIENT_ID is required.");
    }

    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", config.githubClientId);
    url.searchParams.set("scope", "repo read:user");
    url.searchParams.set("state", state);

    res.redirect(url.href);
  })
);

router.get(
  "/github/callback",
  asyncHandler(async (req, res) => {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");

    if (!code || !state || state !== req.session.oauthState) {
      throw new AppError(400, "INVALID_OAUTH_CALLBACK", "GitHub OAuth callback state is invalid.");
    }

    if (!config.githubClientId || !config.githubClientSecret) {
      throw new AppError(500, "GITHUB_OAUTH_NOT_CONFIGURED", "GitHub OAuth credentials are required.");
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code
      })
    });

    const tokenBody = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenBody.access_token) {
      throw new AppError(
        400,
        "GITHUB_TOKEN_EXCHANGE_FAILED",
        tokenBody.error_description ?? tokenBody.error ?? "GitHub token exchange failed."
      );
    }

    const octokit = new Octokit({ auth: tokenBody.access_token });
    const { data: githubUser } = await octokit.users.getAuthenticated();
    const githubId = String(githubUser.id);
    const githubLogin = githubUser.login;

    const user = await prisma.user.upsert({
      where: { githubId },
      update: {
        githubLogin,
        accessToken: encryptToken(tokenBody.access_token)
      },
      create: {
        githubId,
        githubLogin,
        accessToken: encryptToken(tokenBody.access_token)
      }
    });

    req.session.userId = user.id;
    req.session.githubLogin = user.githubLogin;
    req.session.oauthState = undefined;

    res.redirect(config.webUrl);
  })
);

export default router;
