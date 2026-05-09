import request from 'supertest';
import app from '../src/app';
import { User, EmployerProfile, CandidateProfile, Job, Application } from '../src/models';
//@ts-ignore
describe('Job Management API Tests', () => {
  let employerToken: string;
  let candidateToken: string;
  let jobId: number;

  // Helper: Register and login employer
  const createEmployer = async () => {
    const employerData = {
      email: 'employer@test.com',
      password: 'Test1234!',
      firstName: 'John',
      lastName: 'Employer',
      companyName: 'Test Corp',
      industry: 'Technology',
      location: 'San Francisco, CA',
    };

    const response = await request(app).post('/api/v1/jobboard/register/employer').send(employerData);

    return {
      token: response.body.data.tokens.accessToken,
      userId: response.body.data.user.id,
    };
  };

  // Helper: Register and login candidate
  const createCandidate = async () => {
    const candidateData = {
      email: 'candidate@test.com',
      password: 'Test1234!',
      firstName: 'Jane',
      lastName: 'Candidate',
      location: 'New York, NY',
      skills: ['JavaScript', 'React'],
    };

    const response = await request(app).post('/api/v1/jobboard/register/candidate').send(candidateData);

    return {
      token: response.body.data.tokens.accessToken,
      userId: response.body.data.user.id,
    };
  };

  // Setup: Create test users before tests
  //@ts-ignore
  beforeAll(async () => {
    const employer = await createEmployer();
    employerToken = employer.token;

    const candidate = await createCandidate();
    candidateToken = candidate.token;
  });

  // Cleanup: Delete test data after all tests
  //@ts-ignore
  afterAll(async () => {
    await Application.destroy({ where: {}, force: true });
    await Job.destroy({ where: {}, force: true });
    await CandidateProfile.destroy({ where: {}, force: true });
    await EmployerProfile.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });
//@ts-ignore
  describe('POST /api/v1/jobs - Create Job', () => {
    //@ts-ignore
    it('should create a job with valid data (employer)', async () => {
      const jobData = {
        title: 'Senior Full Stack Developer',
        description: 'We are looking for an experienced full stack developer with expertise in React and Node.js',
        category: 'Engineering',
        location: 'San Francisco, CA',
        employmentType: 'full-time',
        salaryMin: 120000,
        salaryMax: 180000,
        currency: 'USD',
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
        aiMatchingEnabled: true,
      };

      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(jobData);
//@ts-ignore
      expect(response.status).toBe(201);
      //@ts-ignore
      expect(response.body.success).toBe(true);
      //@ts-ignore
      expect(response.body.data).toHaveProperty('id');
      //@ts-ignore
      expect(response.body.data.title).toBe(jobData.title);
      //@ts-ignore
      expect(response.body.data.employmentType).toBe(jobData.employmentType);
      //@ts-ignore
      expect(response.body.data.skills).toHaveLength(4);

      // Save jobId for later tests
      jobId = response.body.data.id;
    });
//@ts-ignore
    it('should return 401 without authentication', async () => {
      const jobData = {
        title: 'Test Job',
        description: 'Test description that is long enough',
        employmentType: 'remote',
      };
//@ts-ignore
      const response = await request(app).post('/api/v1/jobs').send(jobData);
//@ts-ignore
      expect(response.status).toBe(401);
    });
//@ts-ignore
    it('should return 403 with candidate role', async () => {
      const jobData = {
        title: 'Test Job',
        description: 'Test description that is long enough',
        employmentType: 'remote',
      };

      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(jobData);
//@ts-ignore
      expect(response.status).toBe(403);
    });
//@ts-ignore
    it('should return400 with invalid data', async () => {
      const jobData = {
        title: '', // Invalid: empty title
        // Missing required description
        employmentType: 'invalid-type', // Invalid enum value
      };

      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(jobData);
//@ts-ignore
      expect(response.status).toBe(400);
    });
  });
//@ts-ignore
  describe('POST /api/v1/jobs/:id/apply - Apply to Job', () => {
    //@ts-ignore
    it('should allow candidate to apply to job', async () => {
      const applicationData = {
        coverLetter: 'I am very interested in this position and believe my skills align well.',
      };

      const response = await request(app)
        .post(`/api/v1/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(applicationData);
//@ts-ignore
      expect(response.status).toBe(201);
      //@ts-ignore
      expect(response.body.success).toBe(true);
      //@ts-ignore
      expect(response.body.data).toHaveProperty('id');
      //@ts-ignore
      expect(response.body.data.status).toBe('pending');
    });
//@ts-ignore
    it('should return 409 when applying to same job again', async () => {
      const applicationData = {
        coverLetter: 'Applying again',
      };

      const response = await request(app)
        .post(`/api/v1/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(applicationData);
//@ts-ignore
      expect(response.status).toBe(409);
      //@ts-ignore
      expect(response.body.message).toContain('already applied');
    });
//@ts-ignore
    it('should return 401 without authentication', async () => {
      const response = await request(app).post(`/api/v1/jobs/${jobId}/apply`).send({});
//@ts-ignore
      expect(response.status).toBe(401);
    });
//@ts-ignore
    it('should return 403 with employer role', async () => {
      const response = await request(app)
        .post(`/api/v1/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({});
//@ts-ignore
      expect(response.status).toBe(403);
    });
  });
//@ts-ignore
  describe('GET /api/v1/jobs - List Jobs', () => {
    //@ts-ignore
    it('should return paginated list of jobs', async () => {
      const response = await request(app).get('/api/v1/jobs?page=1&limit=10');
//@ts-ignore
      expect(response.status).toBe(200);
      //@ts-ignore
      expect(response.body.success).toBe(true);
      //@ts-ignore
      expect(response.body.data).toHaveProperty('jobs');
      //@ts-ignore
      expect(response.body.data).toHaveProperty('total');
      //@ts-ignore
      expect(response.body.data).toHaveProperty('page');
      //@ts-ignore
      expect(response.body.data).toHaveProperty('totalPages');
    });
//@ts-ignore
    it('should filter jobs by category', async () => {
      const response = await request(app).get('/api/v1/jobs?category=Engineering');
//@ts-ignore
      expect(response.status).toBe(200);
    });
  });
//@ts-ignore
  describe('GET /api/v1/jobs/:id - Get Job Details', () => {
    //@ts-ignore
    it('should return job details', async () => {
      const response = await request(app).get(`/api/v1/jobs/${jobId}`);
//@ts-ignore
      expect(response.status).toBe(200);
      //@ts-ignore
      expect(response.body.success).toBe(true);
      //@ts-ignore
      expect(response.body.data).toHaveProperty('id', jobId);
      //@ts-ignore
      expect(response.body.data).toHaveProperty('employerProfile');
    });
//@ts-ignore
    it('should return 404 for non-existent job', async () => {
      const response = await request(app).get('/api/v1/jobs/99999');
  //@ts-ignore
      expect(response.status).toBe(404);
    });
  });
//@ts-ignore
  describe('GET /api/v1/candidates/applications - Candidate Applications', () => {
    //@ts-ignore
    it('should return candidate applications', async () => {
      const response = await request(app)
        .get('/api/v1/candidates/applications')
        .set('Authorization', `Bearer ${candidateToken}`);
//@ts-ignore
      expect(response.status).toBe(200);
      //@ts-ignore
      expect(response.body.success).toBe(true);
      //@ts-ignore
      expect(Array.isArray(response.body.data)).toBe(true);
      //@ts-ignore
      expect(response.body.data.length).toBeGreaterThan(0);
    });
//@ts-ignore
    it('should return 403 for employer', async () => {
      const response = await request(app)
        .get('/api/v1/candidates/applications')
        .set('Authorization', `Bearer ${employerToken}`);
//@ts-ignore
      expect(response.status).toBe(403);
    });
  });
//@ts-ignore
  describe('GET /api/v1/employers/jobs - Employer Jobs', () => {
    //@ts-ignore
    it('should return employer jobs with application counts', async () => {
      const response = await request(app)
        .get('/api/v1/employers/jobs')
        .set('Authorization', `Bearer ${employerToken}`);
//@ts-ignore
      expect(response.status).toBe(200);
      //@ts-ignore
      expect(response.body.success).toBe(true);
      //@ts-ignore
      expect(Array.isArray(response.body.data)).toBe(true);
    });
//@ts-ignore
    it('should return 403 for candidate', async () => {
      const response = await request(app)
        .get('/api/v1/employers/jobs')
        .set('Authorization', `Bearer ${candidateToken}`);
//@ts-ignore
      expect(response.status).toBe(403);
    });
  });
//@ts-ignore
  describe('PUT /api/v1/jobs/:id - Update Job', () => {
    //@ts-ignore
    it('should update job by owner', async () => {
      const updateData = {
        salaryMax: 200000,
        status: 'published',
      };

      const response = await request(app)
        .put(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send(updateData);
//@ts-ignore
      expect(response.status).toBe(200);
      //@ts-ignore
      expect(response.body.success).toBe(true);
      //@ts-ignore
      expect(response.body.data.salaryMax).toBe('200000.00');
    });
  });
//@ts-ignore
  describe('DELETE /api/v1/jobs/:id - Delete Job', () => {
    //@ts-ignore
    it('should soft delete job by owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${employerToken}`);
//@ts-ignore
      expect(response.status).toBe(200);
      //@ts-ignore
      expect(response.body.success).toBe(true);
    });
//@ts-ignore
    it('should not show deleted job in public listing', async () => {
      const response = await request(app).get('/api/v1/jobs');
//@ts-ignore  
      expect(response.status).toBe(200);
      //@ts-ignore
      const jobIds = response.body.data.jobs.map((job: any) => job.id);
      //@ts-ignore
      expect(jobIds).not.toContain(jobId);
    });
  });
});
