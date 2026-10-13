import { Router } from 'express';
import {
  createRequest,
  getRequests,
  updateRequestStatus,
} from '../controllers/requestController';

const router = Router();

router.post('/', createRequest);
router.get('/', getRequests);
router.patch('/:id', updateRequestStatus);

export default router;