import express from "express";
import protect from "../middlewares/authMiddleware";
import { createResume, deleteResume, getPublicResumeById, getResumeById, updateResume } from "../controllers/resumeController";
import upload from "../configs/multer";

const resumeRouter = express.Router();

resumeRouter.post('/create', protect, createResume as any);
resumeRouter.put('/update', upload.single('image'), protect, updateResume as any);
resumeRouter.delete('/delete/:resumeId', protect, deleteResume as any);
resumeRouter.get('/get/:resumeId', protect, getResumeById as any);
resumeRouter.get('/public/:resumeId', getPublicResumeById as any);

export default resumeRouter;