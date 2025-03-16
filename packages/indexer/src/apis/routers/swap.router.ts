import express from 'express';

import { validateQueryData } from '../middlewares/validation.middleware';
import { swapSchema } from '../dtos/swap.dto';
import { simulateSwap } from '../controllers/swap.controller';

const router = express.Router();

router.get('/simulate', validateQueryData(swapSchema), simulateSwap);

export default router;
