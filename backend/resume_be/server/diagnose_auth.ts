import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PUBLIC_KEY_PATH = process.env.JWT_ACCESS_PUBLIC_KEY_PATH 
    ? path.resolve(process.cwd(), process.env.JWT_ACCESS_PUBLIC_KEY_PATH)
    : path.resolve(__dirname, '../../../core/keys/jwt_access_public.pem');

console.log('--- Diagnostic Report ---');
console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);
console.log('PUBLIC_KEY_PATH:', PUBLIC_KEY_PATH);

try {
    if (fs.existsSync(PUBLIC_KEY_PATH)) {
        console.log('✅ Public key file exists.');
        const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
        console.log('✅ Public key loaded successfully. Length:', publicKey.length);
        
        if (publicKey.includes('BEGIN PUBLIC KEY')) {
            console.log('✅ Public key format looks correct.');
        } else {
            console.warn('⚠️ Public key format might be incorrect (no BEGIN PUBLIC KEY header).');
        }
    } else {
        console.error('❌ Public key file does NOT exist at this path.');
    }
} catch (error: any) {
    console.error('❌ Error reading public key:', error.message);
}

console.log('ENV JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('ENV PORT:', process.env.PORT);
console.log('-------------------------');
