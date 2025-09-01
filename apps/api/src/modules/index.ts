import { Router } from 'express';

import users from './users/users.route';
import auth from './auth/auth.route';
import quiz from './quiz/quiz.route';
import health from './health/health.route';

const router: Router = Router();

router.use('/users', users);
router.use('/auth', auth);
router.use('/quiz', quiz);
router.use('/health', health);

export default router;
