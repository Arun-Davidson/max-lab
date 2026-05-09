
import jwtService from './src/services/jwtService';

const token = jwtService.signAccessToken({
  userId: 2,
  email: 'candidate@test.com',
  admin: false,
  role: 'candidate'
});

console.log(token);
