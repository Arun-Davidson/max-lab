import express from "express";
import protect from "../middlewares/authMiddleware";
import { enhanceJobDescription, enhanceProfessionalSummary, uploadResume} from "../controllers/aiController";



const aiRouter = express.Router();


aiRouter.post('/enhance-pro-sum', protect, enhanceProfessionalSummary as any);
aiRouter.post('/enhance-job-desc', protect, enhanceJobDescription as any);
aiRouter.post('/upload-resume', protect, uploadResume as any);

export default aiRouter;