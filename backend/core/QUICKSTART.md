# Quick Start Guide - Job Board Backend

## ✅ Issue Fixed

The database sync error with the PasswordReset model has been resolved. The server is now ready to run.

## 🚀 Starting the Application

### Prerequisites Check

**1. PostgreSQL Database**

Check if PostgreSQL is running:
```bash
# If using Docker (recommended)
docker ps | grep postgres

# If PostgreSQL is stopped, start it:
docker-compose up -d postgres

# OR if installed locally
pg_isready
```

**2. Start the Server**

```bash
npm run start:dev
```

The server will start on `http://localhost:4000`

## 📚 Available Resources

### 1. **API Documentation (Swagger)**
```
http://localhost:4000/api-docs
```
- Interactive API testing
- Complete endpoint documentation
- Try out requests directly from browser

### 2. **Postman Collection**
Import: `Hirion_JobBoard_API.postman_collection.json`
- Pre-configured requests
- Auto token management
- Example data included

### 3. **Setup Guide**
See: `SETUP_JOBBOARD.md`
- Complete installation instructions
- Environment configuration
- Troubleshooting tips

## 🎯 Quick Test

### Register a Candidate:
```bash
curl -X POST http://localhost:4000/api/v1/jobboard/register/candidate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "firstName": "John",
    "lastName": "Doe",
    "location": "San Francisco, CA",
    "availability": "full-time",
    "skills": ["JavaScript", "React", "Node.js"]
  }'
```

### Login:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

## 🔧 If PostgreSQL isn't running:

**Using Docker:**
```bash
docker-compose up -d
```

**Check docker-compose.yml** for database configuration or update `.env` file with your PostgreSQL credentials.

## ✨ Features Ready to Test

- ✅ Candidate Registration
- ✅ Employer Registration  
- ✅ JWT Authentication
- ✅ Profile Management
- ✅ Resume Upload/Download/Delete
- ✅ Password Reset Flow
- ✅ Swagger Documentation
- ✅ Postman Collection

---

**Need help?** Check `SETUP_JOBBOARD.md` for detailed instructions.
