import express from "express";
import { getUserById, getUserResumes, loginUser, registerUser } from "../controllers/userController";
import protect from "../middlewares/authMiddleware";

const userRouter = express.Router();

userRouter.post('/register', registerUser as any);
userRouter.post('/login', loginUser as any);
userRouter.get('/data', protect, getUserById as any);
userRouter.get('/resumes', protect, getUserResumes as any);

export default userRouter;