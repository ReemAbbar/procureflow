import { Router } from 'express';
import { createRFQ, getRFQ, getRFQs, updateRFQ } from '../controllers/rfqController';

const router = Router();

router.post('/', createRFQ);
router.get('/', getRFQs);
router.get('/:id', getRFQ);
router.patch('/:id', updateRFQ);

export default router;
