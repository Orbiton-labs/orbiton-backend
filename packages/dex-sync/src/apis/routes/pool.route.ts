import express, { Router } from "express";
import poolController from "../controllers/pool.controller";
const router: Router = express.Router();

router.get("/", poolController.getAll);

export default router;
