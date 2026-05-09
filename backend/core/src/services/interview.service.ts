import axios from 'axios';
import { Interview, Application, Job, CandidateProfile } from '../models';

const INTERVIEW_SERVICE_URL = process.env.INTERVIEW_SERVICE_URL || 'http://localhost:8000';

class InterviewService {
  /**
   * Start an interview process for a given application
   */
  async startInterview(applicationId: number) {
    const application = await Application.findByPk(applicationId, {
      include: [
        { model: Job, as: 'job' },
        { model: CandidateProfile, as: 'candidateProfile' },
      ],
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Create record in our DB
    const interview = await Interview.create({
      applicationId: application.id,
      jobId: application.jobId,
      candidateProfileId: application.candidateProfileId,
      status: 'pending',
    } as any);

    // Call Python Interview Service
    try {
      await axios.post(`${INTERVIEW_SERVICE_URL}/api/v1/interviews/`, {
        candidate_id: application.candidateProfileId,
        job_role: application.job?.title || 'Unknown Role',
        interview_id_internal: interview.id, // Optional: Pass our ID to correlate later
      });

      // Update our record with the Python service's interview ID if needed
      // interview.remoteId = response.data.id;
      // await interview.save();

      return interview;
    } catch (error: any) {
      console.error('Failed to start interview in Python service:', error.message);
      interview.status = 'failed';
      await interview.save();
      throw new Error('Could not initiate AI interview');
    }
  }

  /**
   * Get interview status/results
   */
  async getInterviewStatus(interviewId: number) {
    const interview = await Interview.findByPk(interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    // Optionally sync with Python service if status is still pending
    if (interview.status === 'pending') {
      try {
        const response = await axios.get(
          `${INTERVIEW_SERVICE_URL}/api/v1/interviews/${interview.id}`,
        );
        if (response.data.status === 'completed') {
          interview.status = 'completed';
          interview.videoUrl = response.data.video_url;
          interview.overallScore = response.data.scores.overall;
          interview.resultJson = response.data;
          await interview.save();
        }
      } catch (error: any) {
        console.warn('Could not sync interview status:', error.message);
      }
    }

    return interview;
  }
}

export default new InterviewService();
