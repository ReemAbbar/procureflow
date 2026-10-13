import { Router } from 'express';
import { createPO, getPO, getPOs, updatePOStatus } from '../controllers/purchaseOrderController';

const router = Router();

router.post('/', createPO);
router.get('/', getPOs);
router.get('/:id', getPO);
router.patch('/:id', updatePOStatus);

export default router;
