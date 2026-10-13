import { Router } from 'express';
import { getNotifications, markAllRead, markRead } from '../controllers/notificationController';

const router = Router();

router.get('/', getNotifications);
// Must be registered before '/:id/read' style routes so "read-all" isn't treated as an id.
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

export default router;
