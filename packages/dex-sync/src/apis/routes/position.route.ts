import express, { Router } from "express";
import PositionController from "../controllers/position.controller";
import PositionMiddleware from "../middlewares/position.middleware";
const router: Router = express.Router();

router.get(
  "/",
  ...PositionMiddleware.validateGetAll(),
  PositionController.getAll
);

export default router;
