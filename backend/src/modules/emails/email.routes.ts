import { Router } from 'express';
import { emailController } from './email.controller';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

// Stats route must be placed before /:id to avoid matching :id = "stats"
router.get('/stats', asyncHandler(emailController.getStats));

router.post('/', asyncHandler(emailController.schedule));
router.get('/', asyncHandler(emailController.list));
router.get('/:id', asyncHandler(emailController.getById));
router.get('/:id/events', asyncHandler(emailController.getEvents));
router.delete('/:id', asyncHandler(emailController.cancel));
router.post('/:id/cancel', asyncHandler(emailController.cancel));

export const emailRoutes = router;
