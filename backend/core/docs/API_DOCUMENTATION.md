# HIRION Core API Documentation

Base URL: `/api/v1`

## Authentication

> [!IMPORTANT]
> **Hybrid User Architecture**: This system uses a **split user model** where candidates and business users (employers/HR) are stored in separate tables (`candidates` and `business_users`). This architecture provides better data isolation, role-specific fields, and improved security. Each user type has dedicated registration and login endpoints.

### Architecture Overview

**Database Tables:**
- `candidates` - Stores candidate user accounts
- `business_users` - Stores employer and HR user accounts
- `candidate_profile` - Extended profile data for candidates (references `candidates.id`)
- `employer_profile` - Extended profile data for employers (references `business_users.id`)
- `refresh_tokens` - Stores refresh tokens (userId can reference either table)

**Key Design Decisions:**
- No database-level foreign key constraints on `refresh_tokens.user_id` to support the hybrid architecture
- Application-level validation ensures data integrity
- Password hashing uses bcrypt with 10 salt rounds
- Sequelize's `underscored: true` maps camelCase attributes to snake_case columns

---

### Register Candidate

**Endpoint:** `POST /auth/register-candidate`
**Description:** Register a new candidate account with profile data.

**Payload:**

```json
{
  "email": "candidate@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "mobileNumber": "+14155551234",
  "candidateType": "Full-Time Job Seeker",
  "primaryJobRole": "Full Stack Developer",
  "yearsExperience": 5,
  "primarySkills": ["JavaScript", "React", "Node.js", "TypeScript", "PostgreSQL"],
  "preferredWorkType": ["remote", "hybrid"],
  "expectedSalaryMin": 100000,
  "expectedSalaryMax": 150000,
  "availableToJoin": "Immediate",
  "acceptedTerms": true,
  "acceptedPrivacyPolicy": true
}
```

**Response:**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": 1,
    "email": "candidate@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "active"
  }
}
```

---

### Register Employer

**Endpoint:** `POST /auth/register-employer`
**Content-Type:** `multipart/form-data`
**Description:** Register a new employer account with company details.

**Form Data:**

```
email: "employer@company.com"
password: "Password123!"
firstName: "Jane"
lastName: "Smith"
companyName: "Tech Corp"
companyDetails: "Leading software company..." (optional)
companyDocument: <file> (PDF/DOCX, required - company verification document)
```

**Response:**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": 1,
    "email": "employer@company.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "employer",
    "companyName": "Tech Corp"
  }
}
```

---

### Register HR

**Endpoint:** `POST /auth/register-hr`
**Content-Type:** `multipart/form-data`
**Description:** Register a new HR user account.

**Form Data:**

```
email: "hr@company.com"
password: "Password123!"
firstName: "Mike"
lastName: "Johnson"
companyName: "Tech Corp"
companyDetails: "HR department..." (optional)
companyDocument: <file> (PDF/DOCX, required)
```

**Response:** Same structure as Register Employer, with `"role": "hr"`

---

### Login Candidate

**Endpoint:** `POST /auth/login-candidate`
**Description:** Authenticate a candidate and receive tokens.

**Payload:**

```json
{
  "email": "candidate@example.com",
  "password": "Password123!"
}
```

**Response:**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": 1,
    "email": "candidate@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

### Login Employer

**Endpoint:** `POST /auth/login-employer`
**Description:** Authenticate an employer and receive tokens.

**Payload:**

```json
{
  "email": "employer@company.com",
  "password": "Password123!"
}
```

**Response:** Same structure as Login Candidate, with additional `role` and `companyName` fields.

---

### Login HR

**Endpoint:** `POST /auth/login-hr`
**Description:** Authenticate an HR user and receive tokens.

**Payload:**

```json
{
  "email": "hr@company.com",
  "password": "Password123!"
}
```

**Response:** Same structure as Login Employer.

---

### Refresh Token

**Endpoint:** `POST /auth/refresh`
**Description:** Get a new access token using a refresh token.
**Headers:** `Authorization: Bearer <access-token>`

**Payload:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

**Response:**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

---

### Logout

**Endpoint:** `POST /auth/logout`
**Description:** Invalidate the refresh token and log out the user.
**Headers:** `Authorization: Bearer <access-token>`

**Payload:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..." // Optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Check Registered Email

**Endpoint:** `POST /auth/check-email`
**Description:** Check if an email is already in use before creating a new account.

**Payload:**

```json
{
  "email": "user@example.com"
}
```

---

### Send Verification OTP

**Endpoint:** `POST /auth/send-verification-otp`
**Description:** Send a 6-digit verification code to the provided email address.
**Note:** In development, the OTP is also logged to the backend console.

**Payload:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Verification OTP sent successfully"
}
```

---

### Verify OTP

**Endpoint:** `POST /auth/verify-otp`
**Description:** Verify the 6-digit code sent to the email.
**Note:** The OTP expires after 10 minutes.

**Payload:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---
```

## Role-Based Access Control (RBAC)

> [!IMPORTANT]
> **DB-Driven Permission System**: All permissions for HR and Employer users are managed through the `employer_permissions` table. This provides flexible, granular control over feature access without code changes.

### Permission Model Overview

**Database Table**: `employer_permissions`

All business users (HR and Employers) have their permissions stored in this table with the following flags:

| Permission Flag | Description | Default (Employer) | Default (HR) |
|----------------|-------------|-------------------|--------------|
| `can_post_job` | Create and manage job postings | `false` | `true` |
| `can_browse_talent` | Access unified talent search (candidates + bench) | `false` | `true` |
| `can_manage_bench` | View, update, delete bench resources | `true` | `false` |
| `can_create_bench` | Create new bench resources | `true` | `false` |
| `plan` | Subscription plan level | `'free'` | `'pro'` |

---

### Authorization Flow

All protected endpoints use this middleware chain:

```
authMiddleware → loadEmployerPermissions → authorize('permission_name')
```

**Middleware Functions:**

1. **`authMiddleware`**: Verifies JWT and loads user from database
2. **`loadEmployerPermissions`**: Fetches permissions from `employer_permissions` table
3. **`authorize(permission)`**: Checks specific permission flag

---

### Permission-to-Feature Mapping

| Feature | Required Permission | Affected Endpoints |
|---------|--------------------|--------------------|
| **Browse Talent** | `can_browse_talent` | `GET /employers/browse-talent` |
| **Post Jobs** | `can_post_job` | `POST /jobs`, `PUT /jobs/:id` |
| **Create Bench Resources** | `can_create_bench` | `POST /employers/post-bench-resource` |
| **Manage Bench Resources** | `can_manage_bench` | `GET /employers/bench-resources`, `PUT /employers/bench-resources/:id`, `DELETE /employers/bench-resources/:id` |

---

### Default Permissions

**On Registration:**

```typescript
// HR User
{
  canPostJob: true,
  canBrowseTalent: true,
  canManageBench: false,
  canCreateBench: false,
  plan: 'pro'
}

// Employer User  
{
  canPostJob: false,
  canBrowseTalent: false,
  canManageBench: true,
  canCreateBench: true,
  plan: 'free'
}
```

---

### Managing Permissions

**Enable/Disable Features via Database:**

```sql
-- Grant browse talent permission to employer
UPDATE employer_permissions 
SET can_browse_talent = true 
WHERE employer_id = 123;

-- Revoke job posting from HR user
UPDATE employer_permissions 
SET can_post_job = false 
WHERE employer_id = 456;

-- Upgrade employer plan
UPDATE employer_permissions 
SET plan = 'pro', can_post_job = true, can_browse_talent = true 
WHERE employer_id = 789;
```

---

### Error Responses

**403 Forbidden - Permission Denied:**

```json
{
  "success": false,
  "code": "ERR_PERMISSION_DENIED",
  "message": "You do not have permission to access this resource. Please upgrade your account or contact administrator."
}
```

**403 Forbidden - Permissions Not Configured:**

```json
{
  "success": false,
  "code": "ERR_PERMISSION_DENIED",
  "message": "Permissions not configured. Please contact administrator.
}
```

---

## Jobboard (Candidates & Employers)

### Register Candidate

**Endpoint:** `POST /jobboard/register/candidate`
**Description:** Register a new candidate account.

**Payload:**

```json
{
  // Required Fields
  "email": "candidate@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "firstName": "Jane",
  "lastName": "Doe",
  "mobileNumber": "+1234567890",
  "candidateType": "Full-Time Job Seeker", // Required. Enum: 'Full-Time Job Seeker', 'Contract / Freelance', 'Hybrid Professional'
  "primaryJobRole": "Software Engineer", // Required
  "yearsExperience": 5, // Required, 0-70
  "primarySkills": ["React", "Node.js", "TypeScript"], // Required, min 1 skill
  "preferredWorkType": ["remote", "hybrid"], // Required. Array of: 'remote', 'hybrid', 'onsite'
  "expectedSalaryMin": 800000, // Required (INR)
  "expectedSalaryMax": 1200000, // Required (INR), must be >= expectedSalaryMin
  "availableToJoin": "Immediate", // Required or specify date
  "acceptedTerms": true, // Required, must be true
  "acceptedPrivacyPolicy": true, // Required, must be true
  
  // Optional Fields
  "city": "Mumbai",
  "country": "India",
  "location": "Mumbai, India",
  "bio": "Experienced full-stack developer...",
  "secondarySkills": ["Python", "AWS"],
  "preferredJobLocations": ["Mumbai", "Bangalore", "Remote"],
  "hourlyRateMin": 30,
  "hourlyRateMax": 50,
  // "availableIn": "Immediate", // Enum: 'Immediate', '15 Days', '30 Days'
  // "englishProficiency": "Basic", // Enum: 'Basic', 'Professional', 'Fluent', 'Native'
  "headline": "Senior Full Stack Developer",
  "resourceType": "",
  "enableAiMatching": true, // Default: false
  "takeSkillAssessment": false, // Default: false
  "scheduleAiInterview": false // Default: false
}
```

### Register Employer

**Endpoint:** `POST /jobboard/register/employer`
**Description:** Register a new employer account.

**Payload:**

```json
{
  "email": "employer@company.com",
  "password": "Password123",
  "firstName": "Boss",
  "lastName": "Man",
  "companyName": "Tech Corp",
  "industry": "Software", // Optional
  "location": "San Francisco, CA", // Optional
  "companySize": "51-200", // Optional. Enum: '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
  "website": "https://techcorp.com", // Optional
  "description": "Leading tech company..." // Optional
}
```

### Get Profile

**Endpoint:** `GET /jobboard/profile`
**Headers:** `Authorization: Bearer <token>`
**Description:** Get the full profile of the currently logged-in user (candidate or employer).
**Note:** For candidates, each resume in the response includes a `viewUrl` for direct browser viewing.

### Update Profile

**Endpoint:** `PUT /jobboard/profile`
**Headers:** `Authorization: Bearer <token>`
**Description:** Update current user's profile. Payload depends on user role.

**Payload (Candidate):**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "johndoe@example.com",
  "location": "New York, NY",
  "candidateType": "Contract / Freelance",
  "bio": "Updated bio...",
  "yearsExperience": 6,
  "skills": ["TypeScript", "AWS"],
  "headline": "Senior Full Stack Developer",
  "resourceType": "BENCH RESOURCE",
  "availableIn": "Immediate",
  "englishProficiency": "Professional",
  "hourlyRateMin": 30,
  "hourlyRateMax": 50,
  "workExperiences": [
    {
      "companyName": "Tech Solutions",
      "role": "Senior Developer",
      "employmentType": "Full-time",
      "startDate": "2020-01-01",
      "endDate": null,
      "description": "Leading the core team...",
      "location": "New York"
    }
  ],
  "projects": [
    {
      "title": "HIRION Clone",
      "description": "A high-performance backend...",
      "techStack": ["Node.js", "PostgreSQL"],
      "projectUrl": "https://github.com/example/project",
      "isFeatured": true
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "issuedBy": "Amazon Web Services",
      "issueDate": "2023-05-15",
      "expiryDate": "2026-05-15",
      "credentialUrl": "https://aws.amazon.com/verify/..."
    }
  ]
}
```

> [!NOTE]
> For `workExperiences`, `projects`, and `certifications`, providing these arrays will **overwrite** any existing records for that candidate. To keep existing items, you must include them in the array.

**Payload (Employer):**

```json
{
  "companyName": "Tech Corp Inc.",
  "industry": "IT Services",
  "location": "Austin, TX",
  "companySize": "201-500",
  "website": "https://newsite.com",
  "description": "Updated description..."
}
```

### Update Profile Image (Employer/HR)

**Endpoint:** `POST /jobboard/profile/image/employer-hr`
**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`
**Description:** Upload a profile image for Employer/HR (JPEG, PNG, WEBP, max 2MB).

**Form Data:**

- `image`: File object

### Get Profile Image (Employer/HR)

**Endpoint:** `GET /users/:id/avatar/business`
**Description:** Retrieve the avatar image for a BusinessUser (Employer or HR).

### Delete Profile Image (Employer/HR)

**Endpoint:** `DELETE /users/:id/avatar/business`
**Headers:** `Authorization: Bearer <token>`
**Description:** Delete the avatar image for a BusinessUser. Only accessible to the owner or admin.

### Upload Resume (Candidate)

**Endpoint:** `POST /jobboard/profile/resume`
**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`
**Description:** Upload a resume file (PDF/DOCX).

**Form Data:**

- `resume`: File object

### Get Resume

**Endpoint:** `GET /jobboard/profile/resume/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Download or view a resume by ID.
**Query Parameters:**

- `view`: Set to `inline` to view in browser safely (e.g., for PDFs). Default is download.

### Set Default Resume (Candidate)

**Endpoint:** `PATCH /jobboard/profile/resume/:id/default`
**Headers:** `Authorization: Bearer <token>`
**Description:** Set a specific resume as the default one for the candidate.

### Delete Resume (Candidate)

**Endpoint:** `DELETE /jobboard/profile/resume/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Delete a specific resume.

---

### Change Password

**Endpoint:** `POST /users/change-password`
**Headers:** `Authorization: Bearer <token>`
**Description:** Update the currently logged-in user's password. Requires verification of the current password.

**Payload:**

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### Delete My Account (Danger Zone)

**Endpoint:** `DELETE /users/me`
**Headers:** `Authorization: Bearer <token>`
**Description:** Permanently delete the currently logged-in user's account and all associated data. **This action is irreversible.**

**Payload:**

```json
{
  "password": "YourPassword123!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## Profile Component Deletion (Candidate)

### Delete Skill

**Endpoint:** `DELETE /jobboard/profile/skills/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Remove a specific skill from the candidate profile.

### Delete Work Experience

**Endpoint:** `DELETE /jobboard/profile/work-experience/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Delete a specific work experience record.

### Delete Project

**Endpoint:** `DELETE /jobboard/profile/projects/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Delete a specific project.

### Delete Certification

**Endpoint:** `DELETE /jobboard/profile/certifications/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Delete a specific certification.

### Forgot Password

**Endpoint:** `POST /jobboard/forgot-password`
**Description:** Request a password reset email. This sends a secure link with a unique reset token to the user's email address.

**Payload:**

```json
{
  "email": "user@example.com"
}
```

### Reset Password

**Endpoint:** `POST /jobboard/reset-password`
**Description:** Reset password using a valid token.

**Payload:**

```json
{
  "token": "reset-token-string",
  "password": "NewPassword123"
}
```

---

## Job Management

> [!IMPORTANT]
> **Middleware & Access Control Logic**: Job endpoints use a layered middleware approach for authentication, authorization, and validation. Understanding this flow is critical for proper API usage.

### Middleware Flow Overview

**Authentication & Authorization Layers:**

1. **`authMiddleware`** - Verifies JWT access token and loads user from database
   - Extracts token from `Authorization: Bearer <token>` header
   - Decodes JWT and identifies `userType` (candidate/business)
   - Loads user from appropriate table (`candidates` or `business_users`)
   - Attaches `user` and `userType` to request object
   - **Returns 401** if token is invalid/expired or user not found

2. **`requireEmployer`** - Ensures user has employer role
   - Checks `user.dataValues.role === 'employer'`
   - **Returns 403** if user is not an employer

3. **`requireCandidate`** - Ensures user has candidate role
   - Checks `user.dataValues.role === 'candidate'`
   - **Returns 403** if user is not a candidate

4. **`requireJobPostPermission()`** - Validates job posting permission
   - Checks `userType === 'business' && user.canPostJob === true`
   - **Returns 403** if user doesn't have `canPostJob` flag enabled
   - This flag is set during employer registration or by admin

5. **`optionalAuth`** - Allows both authenticated and anonymous access
   - Attaches user to request if valid token provided
   - Does not fail if no token present (for public endpoints)

6. **`validate(schema)`** - Validates request payload/query parameters
   - Uses Joi schemas for validation
   - **Returns 400** with detailed validation errors if invalid

---

### Create Job (Employer)

**Endpoint:** `POST /jobs`
**Headers:** `Authorization: Bearer <token>`
**Description:** Create a new job posting.

**Middleware Chain:**
```
authMiddleware → requireEmployer → requireJobPostPermission() → validate(createJobSchema) → createJob
```

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must have `role: 'employer'`
- ✅ Must have `canPostJob: true` flag

**Payload:**

```json
{
  "title": "Senior React Developer",
  "description": "We are looking for...", // Min 10 chars
  "category": "Engineering", // Optional
  "location": "Remote", // Optional
  "employmentType": "full-time", // Required. Enum: 'full-time', 'part-time', 'contract', 'internship', 'freelance'
  "workMode": "remote", // Required. Enum: 'remote', 'hybrid', 'on-site'
  "salaryMin": 80000, // Optional
  "salaryMax": 120000, // Optional, >= salaryMin
  "currency": "USD", // Default 'USD'
  "numberOfOpenings": 5, // Default 1
  "certifications": ["AWS Certified Developer", "React Certification"], // Array of strings
  "openToBenchResources": true, // Default false
  "skills": ["React", "Redux"], // Optional
  "startDate": "2026-03-01", // Optional (Date)
  "duration": 6, // Duration value
  "durationUnit": "months", // Enum: 'weeks', 'months', 'years'
  "aiMatchingEnabled": true, // Default false
  "status": "published" // Default 'draft'. Enum: 'draft', 'published', 'closed'
}
```

**Response:**

```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": 123,
    "title": "Senior React Developer",
    "employerProfileId": 45,
    "status": "published",
    "createdAt": "2026-01-29T16:00:00.000Z"
  }
}
```

---

### Save Job as Draft (Employer)

**Endpoint:** `POST /jobs/draft`
**Headers:** `Authorization: Bearer <token>`
**Description:** Save a job posting as draft without publishing.

**Middleware Chain:**
```
authMiddleware → requireEmployer → requireJobPostPermission() → validate(createJobSchema) → saveJobAsDraft
```

**Payload:** Same as Create Job (status will be set to 'draft' automatically)

---

### Get All Jobs (Public)

**Endpoint:** `GET /jobs`
**Description:** Get a list of active published jobs with filtering.

**Middleware Chain:**
```
optionalAuth → validate(jobQuerySchema) → getJobs
```

**Access Requirements:**
- ✅ Public endpoint (no authentication required)
- ⚠️ Only returns jobs with `status: 'published'` and `isActive: true`

**Query Parameters:**

- `page`: Page number (default 1)
- `limit`: Items per page (default 20)
- `category`: Filter by category
- `location`: Filter by location
- `employmentType`: Filter by type (can be single value or array)
- `workMode`: Filter by work mode ('remote', 'hybrid', 'on-site')
- `salaryMin`: Minimum salary filter
- `salaryMax`: Maximum salary filter
- `skills`: Comma-separated skill names (e.g., `React,Node.js`)
- `keyword`: Search keyword (searches title and description)
- `jobVisibility`: Filter by visibility ('public', 'private', 'all')

**Example:**
```
GET /jobs?category=Engineering&employmentType=full-time&skills=React,TypeScript&page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 123,
        "title": "Senior React Developer",
        "description": "We are looking for...",
        "employmentType": "full-time",
        "workMode": "remote",
        "salaryMin": 80000,
        "salaryMax": 120000,
        "skills": ["React", "TypeScript"],
        "employerProfile": {
          "companyName": "Tech Corp"
        }
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

---

### Get Job by ID

**Endpoint:** `GET /jobs/:id`
**Description:** Get detailed information for a specific job.

**Middleware Chain:**
```
getJobById (no auth required)
```

**Access Requirements:**
- ✅ Public endpoint
- ⚠️ Returns full job details including skills, employer profile, and application count

---

### Update Job (Employer)

**Endpoint:** `PUT /jobs/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Update an existing job posting.

**Middleware Chain:**
```
authMiddleware → requireEmployer → requireJobPostPermission() → validate(updateJobSchema) → updateJob
```

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must be the job owner (employer who created the job)
- ✅ Must have `canPostJob: true` flag

**Payload:**

```json
{
  "title": "Lead React Developer",
  "status": "closed" // Enum: 'draft', 'published', 'closed'
  // ... any other fields from Create Job
}
```

---

### Delete Job (Employer)

**Endpoint:** `DELETE /jobs/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Soft delete a job posting (sets `isActive: false`).

**Middleware Chain:**
```
authMiddleware → requireEmployer → deleteJob
```

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must be the job owner

---

### Get Ranked Talent Matches (Employer)

**Endpoint:** `GET /jobs/:id/matches`
**Headers:** `Authorization: Bearer <token>`
**Description:** Get a ranked list of candidates and bench resources matching a specific job's requirements using AI-powered weighted scoring.

**Middleware Chain:**
```
authMiddleware → requireEmployer → getJobMatches
```

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must be an employer

**Query Parameters:**
- `page`: Page number (default 1)
- `limit`: Items per page (default 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "source": "bench",
      "name": "John Doe",
      "role": "Senior Frontend Developer",
      "matchScore": 95,
      "skills": ["React", "TypeScript", "Node.js"],
      "experience": 6,
      "location": "Bangalore",
      "email": "resource@example.com"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

---

### Apply to Job (Candidate)

**Endpoint:** `POST /jobs/:id/apply`
**Headers:** `Authorization: Bearer <token>`
**Description:** Apply for a specific job.

**Middleware Chain:**
```
authMiddleware → requireCandidate → validate(applyJobSchema) → applyToJob
```

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must have `role: 'candidate'`
- ⚠️ Cannot apply to the same job twice

**Payload:**

```json
{
  "coverLetter": "I am writing to express my interest..." // Optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "id": 456,
    "jobId": 123,
    "candidateProfileId": 78,
    "status": "pending",
    "appliedAt": "2026-01-29T16:00:00.000Z"
  }
}
```

---

### Save Job (Candidate)

**Endpoint:** `POST /jobs/:id/save`
**Headers:** `Authorization: Bearer <token>`
**Description:** Save a job to the candidate's saved jobs list.

**Middleware Chain:**
```
authMiddleware → requireCandidate → saveToJob
```

---

### Get Saved Jobs (Candidate)

**Endpoint:** `GET /jobs/getSavedJobs/all`
**Headers:** `Authorization: Bearer <token>`
**Description:** Get all jobs saved by the current candidate.

**Middleware Chain:**
```
authMiddleware → requireCandidate → getSavedJobs
```

---

### Get My Applications (Candidate)

**Endpoint:** `GET /candidates/applications`
**Headers:** `Authorization: Bearer <token>`
**Description:** Get a list of jobs the current candidate has applied to.

**Middleware Chain:**
```
authMiddleware → requireCandidate → getCandidateApplications
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "status": "pending",
      "appliedAt": "2026-01-29T16:00:00.000Z",
      "job": {
        "id": 123,
        "title": "Senior React Developer",
        "employerProfile": {
          "companyName": "Tech Corp"
        }
      }
    }
  ]
}
```

---

### Get My Jobs (Employer)

**Endpoint:** `GET /employers/jobs`
**Headers:** `Authorization: Bearer <token>`
**Description:** Get all jobs posted by the current employer with application counts.

**Middleware Chain:**
```
authMiddleware → requireEmployer → validate(jobQuerySchema) → getEmployerJobs
```

**Query Parameters:** Same as Get All Jobs, plus:
- `status`: Filter by job status ('draft', 'published', 'closed')
- `title`: Filter by job title

**Response:**

```json
{
  "success": true,
  "message": "Employer jobs fetched successfully",
  "data": [
    {
      "id": 123,
      "title": "Senior React Developer",
      "status": "published",
      "applicationCount": 25,
      "createdAt": "2026-01-29T16:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

---

### Update Application Status (Employer/HR)

**Endpoint:** `PATCH /applications/:id/status`
**Headers:** `Authorization: Bearer <token>`
**Description:** Update the status of a job application.

**Middleware Chain:**
```
authMiddleware → updateApplicationStatus
```

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must be the job owner or HR user

**Payload:**

```json
{
  "status": "shortlisted" // Enum: 'pending', 'reviewed', 'shortlisted', 'rejected', 'interview', 'offered', 'accepted', 'selected'
}
```

---

## Bench Resource Management (Employer)

> [!NOTE]
> **RBAC Protected**: All bench resource endpoints use the RBAC system. Create operations require `can_create_bench` permission, while view/update/delete operations require `can_manage_bench` permission.

### Create Bench Resource

**Endpoint:** `POST /employers/post-bench-resource`  
**Headers:** `Authorization: Bearer <token>` (Employer/HR with permission)  
**Content-Type:** `multipart/form-data`  
**Description:** Add a new bench resource (internal talent) with optional resume upload.

**Middleware Chain:**
```
authMiddleware → loadEmployerPermissions → authorize('create_bench') → validate(benchResourceSchema)
```

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must have `can_create_bench: true` permission
- ⚠️ Default: Employers (true), HR (false)

**Form Data:**

```
resourceName: "John Doe" // Required
currentRole: "Senior React Developer" // Required
designation: "Tech Lead" // Optional
email: "resource@example.com" // Optional
totalExperience: 5.5 // Required (Number, in years)
employeeId: "EMP001" // Required
refCode: "REF123" // Optional
technicalSkills: ["React","Node.js","TypeScript"] // Required (array or JSON string)
professionalSummary: "Experienced developer..." // Optional
hourlyRate: 75 // Required, min 0
currency: "USD" // Default: USD
availableFrom: "2026-02-01" // Required (ISO date)
minimumContractDuration: 3 // Required, months
deploymentPreference: "remote" // Required. Enum: 'remote', 'hybrid', 'onsite'
resume: <file> // Optional (PDF/DOCX, max 5MB)
```

### Get All Bench Resources

**Endpoint:** `GET /employers/bench-resources`  
**Headers:** `Authorization: Bearer <token>` (Employer/HR with permission)  
**Description:** List all bench resources for the logged-in employer with filtering.

**Middleware Chain:**
```
authMiddleware → loadEmployerPermissions → authorize('manage_bench')
```

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must have `can_manage_bench: true` permission
- ⚠️ Default: Employers (true), HR (false)

**Query Parameters:**

- `search`: Search by name/role/designation
- `skills`: Comma-separated skills (e.g., `React,Node.js`)
- `deploymentPreference`: Filter by deployment type
- `minExperience`: Minimum years of experience
- `maxExperience`: Maximum years of experience
- `minRate`: Minimum hourly rate
- `maxRate`: Maximum hourly rate
- `currency`: Currency filter
- `availableFrom`: Filter by availability date
- `isActive`: Filter active/inactive (default: true)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Example:**
```
GET /employers/bench-resources?skills=React,TypeScript&deploymentPreference=remote&page=1&limit=20
```

### Get Bench Resource by ID

**Endpoint:** `GET /employers/bench-resources/:id`  
**Headers:** `Authorization: Bearer <token>` (Employer/HR with permission)  
**Description:** Get detailed information for a specific bench resource.

**Middleware Chain:** `authMiddleware → loadEmployerPermissions → authorize('manage_bench')`

### Update Bench Resource

**Endpoint:** `PUT /employers/bench-resources/:id`  
**Headers:** `Authorization: Bearer <token>` (Employer/HR with permission)  
**Content-Type:** `multipart/form-data`  
**Description:** Update an existing bench resource.

**Middleware Chain:** `authMiddleware → loadEmployerPermissions → authorize('manage_bench') → validate(updateBenchResourceSchema)`

**Form Data:** (All fields optional)

```
resourceName: "John Doe Updated"
currentRole: "Lead Developer"
designation: "Senior Tech Lead"
totalExperience: 6 // Number
employeeId: "EMP001"
refCode: "REF123-A"
technicalSkills: ["React","Node.js","TypeScript","AWS"]
professionalSummary: "Updated summary..."
hourlyRate: 85
currency: "USD"
availableFrom: "2026-03-01"
minimumContractDuration: 6
deploymentPreference: "hybrid"
resume: <file> // Optional, replaces existing resume
```

### Delete Bench Resource

**Endpoint:** `DELETE /employers/bench-resources/:id`  
**Headers:** `Authorization: Bearer <token>` (Employer/HR with permission)  
**Description:** Soft delete a bench resource (sets isActive = false).

**Middleware Chain:** `authMiddleware → loadEmployerPermissions → authorize('manage_bench')`

### Download Bench Resource Resume

**Endpoint:** `GET /employers/bench-resources/:id/resume`  
**Headers:** `Authorization: Bearer <token>` (Employer/HR with permission)  
**Description:** Download the resume file for a bench resource.

**Middleware Chain:** `authMiddleware → loadEmployerPermissions → authorize('manage_bench')`

---

## Talent Search & Browse (Employer)

### Heuristic AI Search Engine (Talent Matching)

The Hirion platform uses a high-performance, two-stage heuristic engine to rank the best talent for any given job. This engine combines raw SQL power for initial matching with advanced Node.js-based heuristics for final scoring.

#### Two-Stage Architecture

1.  **Stage 1: Recall (SQL Layer)**: The system performs a broad sweep across `bench_resource` and `candidate_profile` tables to find candidates that meet minimum metadata requirements or appear relevant based on indexed fields. 
2.  **Stage 2: Scoring (Heuristic Layer)**: The results are passed to the Heuristic Engine which applies sophisticated rules and fuzzy string matching (Jaro-Winkler) to generate a final weighted `matchScore`.

#### Scoring Breakdown & Weights

The engine calculates the `matchScore` (0-100) based on four key pillars:

| Pillar | Weight | Algorithm Details |
|--------|---------|-------------------|
| **Role Similarity** | 30% | Uses **Jaro-Winkler Distance** and substring analysis to compare the Job Title with the Candidate's current/preferred role. |
| **Skill Intersection** | 40% | Calculates the overlap between required job skills and candidate skills. Includes guardrails for empty skill sets. |
| **Experience Fit** | 20% | **Strict Heuristic**: Candidates with < 70% of required experience receive 0 points. Matches or better receive full points. |
| **Metadata Match** | 10% | Binary check for work mode preferences (Remote, Hybrid, Onsite). |

#### Quality & Performance

- **Thresholding**: Candidates with a total score below 10% are filtered out of the results automatically to ensure quality.
- **Sorting**: Results are primary-sorted by `matchScore` (descending) and secondary-sorted by profile recency.
- **Performance**: Heavy fuzzy logic is handled in the application layer to keep the database responsive while providing "AI-like" semantic matching.

---

> [!NOTE]
> **RBAC Protected**: Requires `can_browse_talent` permission in the `employer_permissions` table.

### Browse Talent (Unified Search)

**Endpoint:** `GET /employers/browse-talent`  
**Headers:** `Authorization: Bearer <token>` (Employer/HR with permission)  
**Description:** Search across both public registered candidates and internal bench resources.

**Middleware Chain:**
```
authMiddleware → loadEmployerPermissions → authorize('browse_talent') → validate(talentSearchSchema)
```

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must have `can_browse_talent: true` permission
- ⚠️ Default: Employers (false), HR (true)
- 💡 Employers need this permission upgraded to access talent browsing

**Query Parameters:**

- `type`: Filter by source. Enum: `candidate`, `bench`, `all` (default: `all`)
- `search`: General search across names, roles, and bios
- `jobTitle`: Filter by specific job role
- `skills`: Comma-separated skills (searches both primary and secondary skills)
- `certifications`: Comma-separated certifications
- `experienceMin`: Minimum years of experience
- `experienceMax`: Maximum years of experience
- `workMode`: Filter by `remote`, `hybrid`, or `onsite`
- `location`: Filter by city/country
- `budgetMin`: Minimum salary/rate (INR)
- `budgetMax`: Maximum salary/rate (INR)
- `openToBenchResources`: `1` to include bench resources, `0` to exclude them (default: `1`)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `jobId`: (Optional) ID of a job to score candidates against. If provided, results will be sorted by `matchScore` descending.

**Response Note:**
Each item in the results array contains a `source` field:
- `"source": "bench"`: Internal resource
- `"source": "candidate"`: Public registered candidate

**Example:**
```
GET /employers/browse-talent?type=all&skills=React,Node.js&openToBenchResources=1&page=1&limit=10&jobId=5
```

**Match Score Object:**
When `jobId` is provided, each result will include a `match` object:
```json
"match": {
  "matchScore": 82,
  "matchLabel": "Strong Match",
  "breakdown": {
    "skills": 26.6,
    "experience": 20,
    "role": 10,
    "availability": 10,
    "budget": 10,
    "location": 5
  },
  "reasons": {
    "strengths": ["Strong skill overlap", "Immediate availability"],
    "gaps": ["Expected compensation exceeds budget"]
  }
}
```
Match Labels: `Excellent Match` (90+), `Strong Match` (75-89), `Good Match` (60-74), `Partial Match` (40-59), `Weak Match` (<40).

---

### Get Candidate Profile by ID

**Endpoint:** `GET /employers/candidates/:id`  
**Headers:** `Authorization: Bearer <token>` (Employer/HR)  
**Description:** Retrieve detailed candidate profile information by candidate profile ID. Returns complete profile with work experience, projects, certifications, and resumes.

**Middleware Chain:**
```
authMiddleware → getCandidateById
```

**Access Requirements:**
- ✅ Must be authenticated (Employer or HR)
- ⚠️ Note: Permission check temporarily disabled for testing

**Path Parameters:**
- `id`: Candidate profile ID (number, required)

**Example:**
```
GET /employers/candidates/1
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 5,
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "mobileNumber": "+1234567890",
    "location": "Mumbai, India",
    "city": "Mumbai",
    "country": "India",
    "candidateType": "Full-Time Job Seeker",
    "primaryJobRole": "Full Stack Developer",
    "bio": "Experienced developer with 5 years...",
    "headline": "Senior Full Stack Developer",
    "resourceType": "",
    "candidateType": "Full-Time Job Seeker",
    "availableIn": "Immediate",
    "yearsExperience": 5,
    "primarySkills": ["React", "Node.js", "TypeScript"],
    "secondarySkills": ["AWS", "Docker"],
    "preferredWorkType": ["remote", "hybrid"],
    "preferredJobLocations": ["Mumbai", "Bangalore", "Remote"],
    "hourlyRateMin": 30,
    "hourlyRateMax": 50,
    "expectedSalaryMin": 800000,
    "expectedSalaryMax": 1200000,
    "englishProficiency": "Professional",
    "enableAiMatching": true,
    "workExperiences": [
      {
        "id": 1,
        "companyName": "Tech Solutions",
        "role": "Senior Developer",
        "employmentType": "Full-time",
        "startDate": "2020-01-01",
        "endDate": null,
        "description": "Leading the core team...",
        "location": "Mumbai"
      }
    ],
    "projects": [
      {
        "id": 1,
        "title": "E-commerce Platform",
        "description": "Built a scalable e-commerce solution...",
        "techStack": ["React", "Node.js", "PostgreSQL"],
        "projectUrl": "https://github.com/example/project",
        "isFeatured": true
      }
    ],
    "certifications": [
      {
        "id": 1,
        "name": "AWS Solutions Architect",
        "issuedBy": "Amazon Web Services",
        "issueDate": "2023-05-15",
        "expiryDate": "2026-05-15",
        "credentialUrl": "https://aws.amazon.com/verify/..."
      }
    ],
    "resumes": [
      {
        "id": 1,
        "fileName": "john_doe_resume.pdf",
        "filePath": "/uploads/resumes/...",
        "isDefault": true,
        "uploadedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-02-09T13:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request - Invalid ID:**
```json
{
  "success": false,
  "code": "ERR_INVALID_ID",
  "message": "Invalid candidate ID"
}
```

**404 Not Found - User Not Found:**
```json
{
  "success": false,
  "code": "ERR_USER_NOT_FOUND",
  "message": "User not found"
}
```

**404 Not Found - Profile Not Found:**
```json
{
  "success": false,
  "code": "ERR_PROFILE_NOT_FOUND",
  "message": "Candidate profile not found"
}
```

**Usage Notes:**
- Use this endpoint after browsing talent to view full candidate details
- The `id` parameter refers to the `candidate_profile.id`, not the user ID
- You can get candidate profile IDs from the `/employers/browse-talent` endpoint results
- All associated data (work experiences, projects, etc.) are included in the response

---

### Get Candidate Resume by ID

**Endpoint:** `GET /employers/candidates/:candidateId/resume/:resumeId`  
**Headers:** `Authorization: Bearer <token>` (Employer/HR)  
**Description:** Download or preview a specific resume belonging to a candidate.

**Middleware Chain:**
```
authMiddleware → authorize('browse_talent') → getCandidateResume
```

**Access Requirements:**
- ✅ Must be authenticated (Employer or HR)
- ✅ Must have `browse_talent` permission
- 💡 Can use `?view=inline` as a query parameter to view the resume in browser instead of downloading as an attachment.

**Path Parameters:**
- `candidateId`: Candidate profile ID (number, required)
- `resumeId`: Resume ID (number, required)

**Example:**
```
GET /employers/candidates/1/resume/2?view=inline
```

**Response (200 OK):**
Returns the binary file payload (e.g. PDF, DOCX) dynamically resolving Content-Type and Content-Disposition headers.

**Error Responses:**

**400 Bad Request - Invalid ID:**
```json
{
  "success": false,
  "code": "ERR_INVALID_ID",
  "message": "Invalid resume ID"
}
```

**404 Not Found - Resume Not Found:**
```json
{
  "success": false,
  "code": "ERR_RESUME_NOT_FOUND",
  "message": "Resume not found"
}
```


## User Management

### Get My User Details

**Endpoint:** `GET /users/me`
**Headers:** `Authorization: Bearer <token>`
**Description:** Get current logged-in user's basic details.

### List Users (Admin)

**Endpoint:** `GET /users`
**Headers:** `Authorization: Bearer <token>`
**Description:** List all users (Admin only).

**Query Parameters:**

- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status
- `search`: Search by name or email

### Create User (Admin/UserManagement)

**Endpoint:** `POST /users`
**Headers:** `Authorization: Bearer <token>`
**Description:** Create a new user manually.

**Payload:**

```json
{
  "email": "newuser@example.com",
  "password": "Password123",
  "firstName": "New",
  "lastName": "User",
  "admin": false,
  "language": "en",
  "timezone": "UTC"
}
```

### Get User by ID

**Endpoint:** `GET /users/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Get details of a specific user.

### Update User

**Endpoint:** `PATCH /users/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Update user details. Admin rights required for status/admin flags.

**Payload:**

```json
{
  "firstName": "UpdatedName",
  "status": "active" // Admin only
}
```

### Delete User (Admin)

**Endpoint:** `DELETE /users/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Delete a user account.
---

## User Management

### Get User Avatar

**Endpoint:** `GET /users/:id/avatar`
**Description:** Retrieve a user's avatar image.
**Headers:** `Authorization: Bearer <token>`

**Response:**
Returns the image file (JPEG/PNG/WEBP).

**Error Response (404):**
```json
{
  "success": false,
  "code": "ERR_AVATAR_NOT_FOUND",
  "message": "Avatar not found"
}
```

---

### Delete User Avatar

**Endpoint:** `DELETE /users/:id/avatar`
**Description:** Delete a user's avatar image from the server and database.
**Headers:** `Authorization: Bearer <token>`

**Access Requirements:**
- ✅ Must be authenticated
- ✅ Must be the owner of the account OR a system administrator

**Response:**
```json
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "code": "ERR_UNAUTHORIZED",
  "message": "You are not authorized to delete this avatar"
}
```
### Run Testcases

**Endpoint:** `POST /api/v1/coding/run-testcases`
**Headers:** `Authorization: Bearer <token>`
**Description:** Execute code against all testcases for a problem without saving a submission. Used for immediate feedback to the candidate (e.g., 'Run Code' button).

**Payload:**

```json
{
  "problemId": 1,
  "languageId": 71,
  "code": "print('hello')"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "allPassed": true,
    "results": [
      {
        "testcaseId": 1,
        "passed": true,
        "input": "1 2",
        "expectedOutput": "3",
        "actualOutput": "3",
        "status": "Accepted",
        "isHidden": false
      }
    ]
  }
}
```

---

## Coding Assessment Lifecycle & Reporting

### Start Coding Test

**Endpoint:** `PATCH /api/v1/coding/tests/:id/start`
**Description:** Mark a coding test as started. This sets the `startedAt` timestamp and changes status to `active`.
**Query Parameters:**
- `token` (optional): Invite token for candidate access.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "title": "Front-end Developer Assessment",
    "status": "active",
    "startedAt": "2026-04-10T14:30:00.000Z"
  }
}
```

### End Coding Test

**Endpoint:** `PATCH /api/v1/coding/tests/:id/end`
**Description:** Finalize a coding test. This sets the `submittedAt` timestamp and changes status to `completed`.
**Query Parameters:**
- `token` (optional): Invite token for candidate access.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "status": "completed",
    "submittedAt": "2026-04-10T15:30:00.000Z"
  }
}
```

### Get Problem Tags

**Endpoint:** `GET /api/v1/coding/tags`
**Headers:** `Authorization: Bearer <token>`
**Description:** Retrieve a unique list of all tags/topics currently assigned to coding problems. Use this to filter problems or prepopulate "Assessed Subjects".

**Response:**

```json
{
  "success": true,
  "data": ["Arrays", "Backtracking", "Dynamic Programming", "Strings"]
}
```

### Get My Test Results (Dashboard)

**Endpoint:** `GET /api/v1/coding/tests/my-results`
**Headers:** `Authorization: Bearer <token>`
**Description:** Detailed list of all mock tests created by the user, with overall scores and submission counts.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "title": "React Senior Mock",
      "difficultyDistribution": { "Easy": 1, "Medium": 1 },
      "createdAt": "2026-04-09T10:00:00.000Z",
      "score": 85,
      "submissionCount": 2,
      "status": "completed"
    }
  ]
}
```

### Get Detailed AI Test Report

**Endpoint:** `GET /api/v1/coding/tests/report/:id`
**Headers:** `Authorization: Bearer <token>`
**Description:** Generates a comprehensive report for a coding test, including statistical breakdown and AI-driven feedback for each question.

**Response:**

```json
{
  "success": true,
  "data": {
    "test": {
      "id": 10,
      "title": "React Senior Mock",
      "overallScore": 85,
      "createdAt": "2026-04-09T10:00:00.000Z",
      "difficulty": "Intermediate",
      "duration": 60
    },
    "stats": {
      "questionsReviewed": 2,
      "correctAnswers": 2,
      "codingAccuracy": 100,
      "improvementFocus": "Optimization"
    },
    "questions": [
      {
        "id": 101,
        "title": "Two Sum Problem",
        "type": "Coding Task",
        "status": "Correct",
        "submittedCode": "function solve(...) { ... }",
        "aiFeedback": "The solution is correct and uses a hash map for O(n) complexity. Good job!",
        "explanation": "Given an array of integers...",
        "auditTrail": [
          { "time": "2026-04-09T10:15:00Z", "event": "Test interaction recorded" }
        ]
      }
    ]
  }
}
```

---

## Recent Minor Updates

- **Anti-Cheat Recording Fix**: Resolved a video streaming issue where large recordings were failing to flush correctly to disk. Endpoints under `/api/recordings` now use improved buffering and sequentially flush during streaming.
- **Candidate Registration**: Unified candidate profiles to use `candidateType` field. Added enums for better categorization of talent types.
