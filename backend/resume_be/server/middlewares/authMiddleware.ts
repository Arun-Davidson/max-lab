import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Define a custom request type to include userId
export interface AuthRequest extends Request {
  userId?: string | number;
  user?: any;
}

// Ensure the path is relative to the project root or absolute as per env
const PUBLIC_KEY_PATH = process.env.JWT_ACCESS_PUBLIC_KEY_PATH 
    ? path.resolve(process.cwd(), process.env.JWT_ACCESS_PUBLIC_KEY_PATH)
    : path.resolve(__dirname, '../../../core/keys/jwt_access_public.pem');

let publicKey: string;
try {
  publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
} catch (error) {
  console.warn('Warning: Could not load JWT Public Key from', PUBLIC_KEY_PATH);
  console.warn('Ensure the core project keys are generated and the path is correct.');
}

const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    console.log(authHeader,'authHeader')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        console.log('[Resume BE] Protect middleware triggered for token:', token.substring(0, 10) + '...');
        
        // Diagnostic: Decode without verification to see what's inside
        const preDecoded = jwt.decode(token);
        console.log('--- Auth Diagnostic ---');
        console.log('Token Payload:', JSON.stringify(preDecoded, null, 2));
        console.log('Public Key Loaded:', !!publicKey);
        console.log('-----------------------');

        // Core uses RS256 with specific issuer and audience
        const options: jwt.VerifyOptions = {
            algorithms: publicKey ? ['RS256'] : ['HS256'],
            issuer: 'HIRION-clone',
            audience: 'HIRION-clone-api'
        };

        const decoded = jwt.verify(
            token, 
            publicKey || process.env.JWT_SECRET || 'secret', 
            options
        ) as any;

        req.userId = decoded.userId;
        req.user = decoded; // Attach the whole decoded payload
        next();
    } catch (error: any) {
        console.error('Auth Error in Resume BE:', error, '-', error.message);
        
        let message = `Unauthorized: Invalid token [DEBUG: ${error}]`;
        if (error.name === 'TokenExpiredError') {
            message = 'Unauthorized: Token expired [DEBUG]';
        } else if (error.name === 'JsonWebTokenError') {
            message = `Unauthorized: ${error.message} [DEBUG]`;
        } else if (error.name === 'NotBeforeError') {
            message = 'Unauthorized: Token not yet active [DEBUG]';
        }

        return res.status(401).json({ 
            message,
            status: 401,
            debug_info: {
                error: error.name,
                reason: error.message
            }
        });
    }
};

export default protect;