import crypto from 'crypto';

function hashTokenDeterministic(token: string): string {
  return crypto.createHmac('sha256', process.env.REFRESH_TOKEN_SECRET!).update(token).digest('hex');
}

export default hashTokenDeterministic;
