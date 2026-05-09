import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db";
import userRouter from "./routes/userRoutes";
import resumeRouter from "./routes/resumeRoutes";
import aiRouter from "./routes/aiRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const startServer = async () => {
    await connectDB();
    
    app.use(express.json());
    app.use(cors());

    // Request logging
    app.use((req, res, next) => {
        console.log(`[Resume BE] ${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });

    app.get('/', (req: Request, res: Response) => res.send("Server is live..."));
    app.use('/api/users', userRouter);
    app.use('/api/resumes', resumeRouter);
    app.use('/api/ai', aiRouter);

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer().catch(err => {
    console.error("Failed to start server:", err);
});