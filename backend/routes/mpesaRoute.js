import express from 'express';
import { stkPush, mpesaCallback } from '../controllers/orderController.js';

const router = express.Router();

router.post('/stkpush', stkPush);
router.post('/callback', mpesaCallback);

export default router;
