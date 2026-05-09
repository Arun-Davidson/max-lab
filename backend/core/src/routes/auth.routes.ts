import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadBusinessDocument } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 default: user
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/register-candidate', authController.registerCandidate);
router.post('/register-employer', uploadBusinessDocument, authController.registerEmployer);
router.post('/register-hr', uploadBusinessDocument, authController.registerHR);
router.post('/check-email', authController.checkEmail);

// OTP Verification
router.post('/send-verification-otp', authController.sendVerificationOtp);
router.post('/verify-otp', authController.verifyOtp);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login-candidate', authController.loginCandidate);
router.post('/login-employer', authController.loginEmployer);
router.post('/login-hr', authController.loginHR);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: |
 *       Generates a new access token using a valid refresh token.
 *       The refresh token must be active, not revoked, and not expired.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []   # Only include this if authMiddleware expects an access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token issued during login
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   description: New JWT access token
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Refresh token missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Refresh token required
 *                 code:
 *                   type: string
 *                   example: ERR_REFRESH_TOKEN_REQUIRED
 *       401:
 *         description: Invalid or expired refresh token, or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid refresh token
 *                 code:
 *                   type: string
 *                   example: ERR_INVALID_TOKEN
 */

router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: |
 *       Logs out the authenticated user by revoking the provided refresh token.
 *       If a refresh token is supplied, it will be invalidated and cannot be used again.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to revoke (optional)
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized (missing or invalid access token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 */

router.post('/logout', authMiddleware, authController.logout);

/**
 * @swagger
 * /api/v1/auth/google:
 *   post:
 *     summary: Google OAuth authentication
 *     tags: [Auth]
 */
router.post('/google', async (_req, res) => {
  // TODO: Implement Google OAuth logic
  res.json({ message: 'Google OAuth endpoint - TODO' });
});

export default router;
