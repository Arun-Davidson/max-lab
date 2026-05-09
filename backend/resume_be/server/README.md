# Resume Builder Service (TypeScript)

This is the TypeScript-migrated version of the Resume Builder service, now integrated with HIRION Core backend.

## Integration with Core

This service now:
- **Shares authentication** with Core via JWT public key verification (RS256)
- **Proxied through Core** at `/api/v1/resumes` and `/api/v1/ai`
- Uses MongoDB for resume data storage (separate from Core's PostgreSQL)

## Quick Start

```bash
cd /Users/bharath/Desktop/HIRION_BE/BE/resume_be/server

# Install dependencies (if not already installed)
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run in production mode
npm start
```

## Environment Variables

Configure `.env`:
```env
JWT_ACCESS_PUBLIC_KEY_PATH=../core/keys/jwt_access_public.pem
MONGODB_URI=mongodb://localhost:27017
PORT=3000
OPENAI_API_KEY=your_openai_key
```

## API Endpoints

All endpoints are accessed through Core at `http://localhost:4000/api/v1/`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/resumes/create` | Create a new resume |
| `PUT` | `/resumes/update` | Update resume with AI enhancements |
| `GET` | `/resumes/get/:id` | Get resume by ID |
| `DELETE` | `/resumes/delete/:id` | Delete resume |
| `POST` | `/ai/enhance-pro-sum` | AI-enhance professional summary |
| `POST` | `/ai/enhance-job-desc` | AI-enhance job description |
| `POST` | `/ai/upload-resume` | Parse uploaded resume with AI |

## Authentication

All requests must include a JWT token from Core:
```
Authorization: Bearer <token_from_core_login>
```

The token is verified using Core's RSA public key.
