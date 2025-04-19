import { Router } from 'express';
import { sessionMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', sessionMiddleware, (_req, res) => {
    res.render('chat');
});

export default router; 