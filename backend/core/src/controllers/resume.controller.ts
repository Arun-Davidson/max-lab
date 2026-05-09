import { Response, NextFunction } from 'express';
import fs from 'fs';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import config from '../config';
import { AuthRequest } from '../middleware/authMiddleware';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

/**
 * Generic axios-based proxy handler to forward requests to microservices
 */
const forwardRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  targetPath: string,
) => {
  try {
    const url = `${config.services.resumeBeUrl}${targetPath}`;
    const token = req.headers.authorization;
    console.log('________________________');
    console.log(token, 'token');
    console.log('________________________');

    logger.info(`[Axios Proxy] Forwarding ${req.method} to ${url}`);

    const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
    let axiosData = req.body;
    let axiosHeaders: any = {
      ...(token ? { Authorization: token } : {}),
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

    if (isMultipart) {
      const form = new FormData();

      // Add text fields from body
      Object.keys(req.body).forEach((key) => {
        const value = req.body[key];
        if (typeof value === 'object') {
          form.append(key, JSON.stringify(value));
        } else {
          form.append(key, value);
        }
      });

      // Add file if present
      if (req.file) {
        form.append(req.file.fieldname, fs.createReadStream(req.file.path), {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        });
      }

      axiosData = form;
      axiosHeaders = {
        ...axiosHeaders,
        ...form.getHeaders(),
      };
    }

    const configRequest: AxiosRequestConfig = {
      method: req.method,
      url,
      data: axiosData,
      params: req.query,
      headers: axiosHeaders,
      validateStatus: () => true,
    };

    const response = await axios(configRequest);

    res.status(response.status).json(response.data);
  } catch (error) {
    console.log(error, 'error');
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error(`[Axios Proxy Error] ${axiosError.message}`, {
        url: axiosError.config?.url,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
      });

      return next(
        new AppError(
          axiosError.message || 'Microservice communication error',
          (axiosError.response?.status as number) || StatusCodes.INTERNAL_SERVER_ERROR,
          'ERR_MICROSERVICE',
        ),
      );
    }
    next(error);
  }
};

/**
 * Handle resume related routes
 */
export const handleResumes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Determine target path based on the actual request path
  // If req.originalUrl is /api/v1/resumes/update, and we want /api/resumes/update
  const path = req.originalUrl.replace('/api/v1/resumes', '/api/resumes');
  await forwardRequest(req, res, next, path);
};

/**
 * Handle AI related routes
 */
export const handleAI = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const targetPath = `/api/ai${req.url === '/' ? '' : req.url}`;
  await forwardRequest(req, res, next, targetPath);
};
