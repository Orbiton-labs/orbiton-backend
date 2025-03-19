import express from 'express';

import { validateQueryData } from '../middlewares/validation.middleware';
import { swapSchema } from '../dtos/swap.dto';
import { simulateSwap } from '../controllers/swap.controller';
import { asyncErrorWrapper } from '../../utils/error-wrapper';

const router = express.Router();

router.get('/simulate', validateQueryData(swapSchema), asyncErrorWrapper(simulateSwap));

export default router;
