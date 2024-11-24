import express, { Router } from "express";
import poolController from "../controllers/pool.controller";
const router: Router = express.Router();

router.get("/", poolController.getAll);
router.get("/simulate_swap", poolController.simulateSwap);

export default router;
