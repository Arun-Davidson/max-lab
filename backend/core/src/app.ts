import express, { Application, Request, Response } from 'express';
import 'express-async-errors';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import config from './config';
import logger, { httpLogStream } from './config/logger';
import { initAssociations } from './models';

// Middleware imports
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import jobboardRoutes from './routes/jobboard.routes';
import jobRoutes from './routes/job.routes';

import interviewRoutes from './routes/interview.routes';
import codingRoutes from './routes/coding.routes';
import antiCheatRoutes from './routes/antiCheat';

import employerRoutes from './routes/employer.routes';
import * as resumeController from './controllers/resume.controller';
// import { authMiddleware } from './middleware/authMiddleware';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

// Initialize model associations
initAssociations();

const app: Application = express();

// Trust proxy (for reverse proxy setups like Nginx)
app.set('trust proxy', 1);

// Security middleware
if (config.security.helmet) {
  app.use(
    helmet({
      contentSecurityPolicy: config.env === 'production',
    }),
  );
}

// CORS
if (config.cors.enabled) {
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) return callback(null, true);

        // In development, allow all origins
        if (config.env === 'development') {
          return callback(null, true);
        }

        // In production, check against whitelist
        if (config.cors.origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    }),
  );
}

// Compression
if (config.security.compression) {
  app.use(
    compression({
      filter: (req, res) => {
        const requestPath = req.originalUrl || req.url;

        if (requestPath.startsWith('/api/recordings')) {
          return false;
        }

        return compression.filter(req, res);
      },
    }),
  );
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (config.env !== 'test') {
  app.use(morgan('combined', { stream: httpLogStream }));
}

// Custom request logger (adds request ID)
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// Versioned health (for Postman expectation)
// app.get('/api/v1/health', (_req: Request, res: Response) => {
//   res.json({
//     status: 'ok',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: config.env,
//   });
// });

// API v1 routes
const apiRouter = express.Router();

// Axios-based routes for alternate microservices
apiRouter.put('/resumes/update', upload.single('image'), resumeController.handleResumes);
apiRouter.use('/resumes', resumeController.handleResumes);
apiRouter.use('/ai', resumeController.handleAI);

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/jobboard', jobboardRoutes);
apiRouter.use('/', jobRoutes); // Job routes are at /api/v1/jobs, /api/v1/candidates, /api/v1/employers

apiRouter.use('/interviews', interviewRoutes);
apiRouter.use('/coding', codingRoutes);

apiRouter.use('/employers', employerRoutes);
// apiRouter.use('/projects', projectRoutes);
// apiRouter.use('/issues', issueRoutes);
// apiRouter.use('/time-entries', timeEntryRoutes);
// apiRouter.use('/reports', reportRoutes);
// apiRouter.use('/admin', adminRoutes);

app.use('/api/v1', apiRouter);

// Anti-cheat backend routes (preserve the standalone /api/* contract)
app.use('/api/v1', antiCheatRoutes);

// Static uploads
app.use('/uploads', express.static('uploads'));

// API documentation (if enabled)
if (config.features.apiDocs && config.env !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerJsdoc = require('swagger-jsdoc');

  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'HIRION Clone API',
        version: '1.0.0',
        description: 'Complete REST API for HIRION-like project management system',
      },
      servers: [
        {
          url: config.baseUrl,
          description: 'API Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  logger.info('API documentation available at /api-docs');
}

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
