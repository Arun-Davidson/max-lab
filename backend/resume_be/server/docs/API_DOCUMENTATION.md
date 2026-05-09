# Resume Backend API Documentation

Base URL: `http://localhost:3000`

## Authentication

### Register User
- **Endpoint**: `POST /api/users/register`
- **Description**: Registers a new user.
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "message": "User created successfully",
    "token": "jwt_token_here",
    "user": { ... }
  }
  ```

### Login User
- **Endpoint**: `POST /api/users/login`
- **Description**: Authenticates a user and returns a token.
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Login successful",
    "token": "jwt_token_here",
    "user": { ... }
  }
  ```

### Get User Data
- **Endpoint**: `GET /api/users/data`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Retrieves the authenticated user's data.
- **Response**:
  ```json
  {
    "user": { ... }
  }
  ```

### Get User Resumes
- **Endpoint**: `GET /api/users/resumes`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Retrieves all resumes created by the authenticated user.
- **Response**:
  ```json
  {
    "resumes": [ ... ]
  }
  ```

## Resumes

### Create Resume
- **Endpoint**: `POST /api/resumes/create`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Creates a new resume entry.
- **Request Body**:
  ```json
  {
    "title": "My Resume"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Resume created successfully",
    "resume": { ... }
  }
  ```

### Update Resume
- **Endpoint**: `PUT /api/resumes/update`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `multipart/form-data`
- **Description**: Updates an existing resume. Supports image upload.
- **Request Body (FormData)**:
  - `resumeId`: The ID of the resume to update.
  - `resumeData`: JSON Object or Stringified JSON containing resume details (personal_info, etc.).
  - `removeBackground` (optional): Boolean/String ("true"/"false") to remove background from uploaded image.
  - `image` (optional): File to upload.
- **Response**:
  ```json
  {
    "message": "Saved successfully",
    "resume": { ... }
  }
  ```

### Delete Resume
- **Endpoint**: `DELETE /api/resumes/delete/:resumeId`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Deletes a resume by ID.
- **Response**:
  ```json
  {
    "message": "Resume deleted successfully"
  }
  ```

### Get Resume by ID
- **Endpoint**: `GET /api/resumes/get/:resumeId`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Retrieves a specific resume by ID for the authenticated user.
- **Response**:
  ```json
  {
    "resume": { ... }
  }
  ```

### Get Public Resume
- **Endpoint**: `GET /api/resumes/public/:resumeId`
- **Description**: Retrieves a public resume by ID.
- **Response**:
  ```json
  {
    "resume": { ... }
  }
  ```

## AI Features

### Enhance Professional Summary
- **Endpoint**: `POST /api/ai/enhance-pro-sum`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Enhances the professional summary using AI.
- **Request Body**:
  ```json
  {
    "userContent": "I am a developer with 5 years experience."
  }
  ```
- **Response**:
  ```json
  {
    "enhancedContent": "..."
  }
  ```

### Enhance Job Description
- **Endpoint**: `POST /api/ai/enhance-job-desc`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Enhances a job description using AI.
- **Request Body**:
  ```json
  {
    "userContent": "Worked on backend using Node.js"
  }
  ```
- **Response**:
  ```json
  {
    "enhancedContent": "..."
  }
  ```

### Upload Resume Text
- **Endpoint**: `POST /api/ai/upload-resume`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Extracts data from resume text to create a structured resume.
- **Request Body**:
  ```json
  {
    "title": "Extracted Resume",
    "resumeText": "Full text of the resume..."
  }
  ```
- **Response**:
  ```json
  {
    "resumeId": "..."
  }
  ```
