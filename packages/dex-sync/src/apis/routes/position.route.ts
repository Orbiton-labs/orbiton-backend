import express, { Router } from "express";
import positionController from "../controllers/position.controller";
const router: Router = express.Router();

router.get("/", positionController.getAll);

export default router;
