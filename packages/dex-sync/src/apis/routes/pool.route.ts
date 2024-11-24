import express, { Router } from "express";
import PoolController from "../controllers/pool.controller";
import PoolMiddleware from "../middlewares/pool.middleware";
const router: Router = express.Router();

router.get("/", PoolController.getAll);
router.get(
  "/simulate_swap",
  ...PoolMiddleware.validateSimulateSwap(),
  PoolController.simulateSwap
);

export default router;
