import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import * as userController from '../controllers/user.controller';
import { requireUserManagement } from '../middleware/rbacMiddleware';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

router.get('/me', userController.getCurrentUser);
router.post('/change-password', userController.changePassword);
router.delete('/me', userController.deleteMyAccount);
router.get('/', requireAdmin, userController.listUsers);
router.post('/', requireUserManagement, userController.createUser);
router.get('/:id', userController.getUserById);
router.get('/:id/avatar', userController.getAvatarImage);
router.patch('/:id', userController.updateUser);
router.delete('/:id', requireUserManagement, userController.deleteUser);
router.delete('/:id/avatar', userController.deleteAvatarImage);

router.get('/:id/avatar/business', userController.getAvatarImageEmployerHr);
router.delete('/:id/avatar/business', userController.deleteAvatarImageEmployerHr);

export default router;
