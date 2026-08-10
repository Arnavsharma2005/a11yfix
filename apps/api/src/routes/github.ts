import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../middleware/auth";

const router: ExpressRouter = Router();

router.use(requireAuth);

router.get("/me", (req, res) => {
  res.json({
    id: req.user!.id,
    githubLogin: req.user!.githubLogin
  });
});

export default router;
