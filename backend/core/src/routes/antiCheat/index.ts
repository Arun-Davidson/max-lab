import { Router } from 'express';
import sessionRoutes from './session.routes';
import violationRoutes from './violations.routes';
import recordingRoutes from './recordings.routes';

const router = Router();

router.use('/session', sessionRoutes);
router.use('/violations', violationRoutes);
router.use('/recordings', recordingRoutes);

export default router;
