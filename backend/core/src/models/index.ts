import sequelize from '../db/sequelize';
import User from './User';
import Role from './Role';
import AuditLog from './AuditLog';
import RefreshToken from './RefreshToken';
import Candidate from './Candidate';
import BusinessUser from './BusinessUser';

// Job Board Models
import CandidateProfile from './CandidateProfile';
import EmployerProfile from './EmployerProfile';
import Skill from './Skill';
import CandidateSkill from './CandidateSkill';
import Resume from './Resume';
import Job from './Job';
import JobSkill from './JobSkill';
import JobNiceToHaveSkill from './JobNiceToHaveSkill';
import JobSaved from './SavedJobs';
import Application from './Application';
import PasswordReset from './PasswordReset';
import WorkExperience from './WorkExperience';
import Project from './Project';
import Certification from './Certification';
import BenchResource from './BenchResource';
import EmployerPermission from './EmployerPermission';
import EmailVerification from './EmailVerification';
import ResumeAnalysis from './ResumeAnalysis';
import JobMatch from './JobMatch';
import Interview from './Interview';
import Problem from './Problem';
import Testcase from './Testcase';
import CodingTest from './CodingTest';
import CodingTestProblem from './CodingTestProblem';
import Submission from './Submission';
import ProfileView from './ProfileView';
import EmployerShortlist from './EmployerShortlist';

let associationsInitialized = false;

// Define model associations
const initAssociations = () => {
  if (associationsInitialized) {
    return;
  }
  associationsInitialized = true;

  // Identity <-> Profile associations for base User model (fallback/legacy)
  User.hasOne(CandidateProfile, { foreignKey: 'userId', as: 'candidateProfile' });
  CandidateProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasOne(EmployerProfile, { foreignKey: 'userId', as: 'employerProfile' });
  EmployerProfile.belongsTo(User, { foreignKey: 'userId', as: 'userBase' });

  // Existing associations
  // RefreshToken.belongsTo(User, { foreignKey: 'userId' });

  // Job Board associations

  // Identity <-> Profile associations

  // Candidate <-> CandidateProfile (one-to-one)
  Candidate.hasOne(CandidateProfile, { foreignKey: 'userId', as: 'candidateProfile' });
  CandidateProfile.belongsTo(Candidate, { foreignKey: 'userId', as: 'candidate' });

  // BusinessUser <-> EmployerProfile (one-to-one)
  BusinessUser.hasOne(EmployerProfile, { foreignKey: 'userId', as: 'employerProfile' });
  EmployerProfile.belongsTo(BusinessUser, { foreignKey: 'userId', as: 'businessUser' });

  // CandidateProfile <-> Skill (many-to-many via CandidateSkill)
  CandidateProfile.belongsToMany(Skill, {
    through: CandidateSkill,
    foreignKey: 'candidateProfileId',
    otherKey: 'skillId',
    as: 'skills',
  });
  Skill.belongsToMany(CandidateProfile, {
    through: CandidateSkill,
    foreignKey: 'skillId',
    otherKey: 'candidateProfileId',
    as: 'candidates',
  });

  // CandidateProfile <-> Resume (one-to-many)
  CandidateProfile.hasMany(Resume, { foreignKey: 'candidateProfileId', as: 'resumes' });
  Resume.belongsTo(CandidateProfile, { foreignKey: 'candidateProfileId', as: 'candidateProfile' });

  // EmployerProfile <-> Job (one-to-many)
  EmployerProfile.hasMany(Job, { foreignKey: 'employerProfileId', as: 'jobs' });
  Job.belongsTo(EmployerProfile, { foreignKey: 'employerProfileId', as: 'employerProfile' });

  // EmployerProfile <-> BenchResource (one-to-many)
  EmployerProfile.hasMany(BenchResource, { foreignKey: 'employerProfileId', as: 'benchResources' });
  BenchResource.belongsTo(EmployerProfile, {
    foreignKey: 'employerProfileId',
    as: 'employerProfile',
  });

  // Job <-> Skill (many-to-many via JobSkill)
  Job.belongsToMany(Skill, {
    through: JobSkill,
    foreignKey: 'jobId',
    otherKey: 'skillId',
    as: 'skills',
  });

  Skill.belongsToMany(Job, {
    through: JobSkill,
    foreignKey: 'skillId',
    otherKey: 'jobId',
    as: 'jobs',
  });

  // Job <-> Skill (many-to-many via JobNiceToHaveSkill)
  Job.belongsToMany(Skill, {
    through: JobNiceToHaveSkill,
    foreignKey: 'jobId',
    otherKey: 'skillId',
    as: 'niceToHaveSkills',
  });

  Skill.belongsToMany(Job, {
    through: JobNiceToHaveSkill,
    foreignKey: 'skillId',
    otherKey: 'jobId',
    as: 'niceToHaveJobs',
  });

  // CandidateProfile <-> Job (Saved Jobs)
  CandidateProfile.belongsToMany(Job, {
    through: JobSaved,
    foreignKey: 'candidateProfileId',
    otherKey: 'jobId',
    as: 'savedJobs',
  });

  Job.belongsToMany(CandidateProfile, {
    through: JobSaved,
    foreignKey: 'jobId',
    otherKey: 'candidateProfileId',
    as: 'savedByCandidates',
  });

  // CandidateProfile <-> WorkExperience
  CandidateProfile.hasMany(WorkExperience, {
    foreignKey: 'candidateProfileId',
    as: 'workExperiences',
  });
  WorkExperience.belongsTo(CandidateProfile, {
    foreignKey: 'candidateProfileId',
    as: 'candidateProfile',
  });

  // CandidateProfile <-> Project
  CandidateProfile.hasMany(Project, {
    foreignKey: 'candidateProfileId',
    as: 'projects',
  });
  Project.belongsTo(CandidateProfile, {
    foreignKey: 'candidateProfileId',
    as: 'candidateProfile',
  });

  // CandidateProfile <-> Certification
  CandidateProfile.hasMany(Certification, {
    foreignKey: 'candidateProfileId',
    as: 'certifications',
  });
  Certification.belongsTo(CandidateProfile, {
    foreignKey: 'candidateProfileId',
    as: 'candidateProfile',
  });

  JobSaved.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });
  JobSaved.belongsTo(CandidateProfile, {
    foreignKey: 'candidateProfileId',
    as: 'candidateProfile',
  });
  Job.hasMany(JobSaved, { foreignKey: 'jobId', as: 'savedEntries' });
  CandidateProfile.hasMany(JobSaved, { foreignKey: 'candidateProfileId', as: 'savedJobsEntries' });

  // Application relationships
  CandidateProfile.hasMany(Application, { foreignKey: 'candidateProfileId', as: 'applications' });
  Application.belongsTo(CandidateProfile, {
    foreignKey: 'candidateProfileId',
    as: 'candidateProfile',
  });

  Job.hasMany(Application, { foreignKey: 'jobId', as: 'applications' });
  Application.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

  Resume.hasMany(Application, { foreignKey: 'resumeId', as: 'applications' });
  Application.belongsTo(Resume, { foreignKey: 'resumeId', as: 'resume' });

  // User <-> PasswordReset (one-to-many)
  // User.hasMany(PasswordReset, { foreignKey: 'userId', as: 'passwordResets' });
  // PasswordReset.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // AI Model Associations

  // Resume <-> ResumeAnalysis (one-to-one)
  Resume.hasOne(ResumeAnalysis, { foreignKey: 'resumeId', as: 'analysis' });
  ResumeAnalysis.belongsTo(Resume, { foreignKey: 'resumeId', as: 'resume' });

  // Job <-> JobMatch (one-to-many)
  Job.hasMany(JobMatch, { foreignKey: 'jobId', as: 'matches' });
  JobMatch.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

  // CandidateProfile <-> JobMatch (one-to-many)
  CandidateProfile.hasMany(JobMatch, { foreignKey: 'candidateProfileId', as: 'jobMatches' });
  JobMatch.belongsTo(CandidateProfile, {
    foreignKey: 'candidateProfileId',
    as: 'candidateProfile',
  });

  // Interview Associations
  Application.hasOne(Interview, { foreignKey: 'applicationId', as: 'interview' });
  Interview.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

  CandidateProfile.hasMany(Interview, { foreignKey: 'candidateProfileId', as: 'interviews' });
  Interview.belongsTo(CandidateProfile, {
    foreignKey: 'candidateProfileId',
    as: 'candidateProfile',
  });

  Job.hasMany(Interview, { foreignKey: 'jobId', as: 'interviews' });
  Interview.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

  // BenchResource <-> Application (one-to-many)
  BenchResource.hasMany(Application, { foreignKey: 'benchResourceId', as: 'applications' });
  Application.belongsTo(BenchResource, { foreignKey: 'benchResourceId', as: 'benchResource' });

  // BusinessUser <-> EmployerPermission (one-to-one)
  BusinessUser.hasOne(EmployerPermission, { foreignKey: 'employerId', as: 'permissions' });
  EmployerPermission.belongsTo(BusinessUser, { foreignKey: 'employerId', as: 'employer' });

  // Coding Assessment Associations
  Problem.hasMany(Testcase, { foreignKey: 'problemId', as: 'testcases' });
  Testcase.belongsTo(Problem, { foreignKey: 'problemId', as: 'problem' });

  // CodingTest.belongsTo(User, { foreignKey: 'interviewerId', as: 'interviewer' });

  CodingTest.hasMany(CodingTestProblem, { foreignKey: 'testId', as: 'testProblems' });
  CodingTestProblem.belongsTo(CodingTest, { foreignKey: 'testId', as: 'test' });

  Problem.hasMany(CodingTestProblem, { foreignKey: 'problemId', as: 'problemTests' });
  CodingTestProblem.belongsTo(Problem, { foreignKey: 'problemId', as: 'problem' });

  // Indirect association for easier querying
  CodingTest.belongsToMany(Problem, {
    through: CodingTestProblem,
    foreignKey: 'testId',
    otherKey: 'problemId',
    as: 'problems',
  });
  Problem.belongsToMany(CodingTest, {
    through: CodingTestProblem,
    foreignKey: 'problemId',
    otherKey: 'testId',
    as: 'tests',
  });

  // User.hasMany(Submission, { foreignKey: 'userId', as: 'submissions' });
  // Submission.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  CodingTest.hasMany(Submission, { foreignKey: 'testId', as: 'submissions' });
  Submission.belongsTo(CodingTest, { foreignKey: 'testId', as: 'test' });

  Problem.hasMany(Submission, { foreignKey: 'problemId', as: 'submissions' });
  Submission.belongsTo(Problem, { foreignKey: 'problemId', as: 'problem' });

  // Profile View Associations
  CandidateProfile.hasMany(ProfileView, { foreignKey: 'candidateProfileId', as: 'profileViews' });
  ProfileView.belongsTo(CandidateProfile, { foreignKey: 'candidateProfileId', as: 'candidateProfile' });

  BenchResource.hasMany(ProfileView, { foreignKey: 'benchResourceId', as: 'profileViews' });
  ProfileView.belongsTo(BenchResource, { foreignKey: 'benchResourceId', as: 'benchResource' });

  BusinessUser.hasMany(ProfileView, { foreignKey: 'viewerId', as: 'candidateViews' });
  ProfileView.belongsTo(BusinessUser, { foreignKey: 'viewerId', as: 'viewer' });

  // EmployerShortlist Associations
  Job.hasMany(EmployerShortlist, { foreignKey: 'jobId', as: 'shortlists' });
  EmployerShortlist.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

  EmployerProfile.hasMany(EmployerShortlist, { foreignKey: 'employerProfileId', as: 'shortlists' });
  EmployerShortlist.belongsTo(EmployerProfile, { foreignKey: 'employerProfileId', as: 'employerProfile' });
};

export {
  sequelize,
  User,
  Candidate,
  BusinessUser,
  Role,
  AuditLog,
  RefreshToken,
  // Job Board Models
  CandidateProfile,
  EmployerProfile,
  Skill,
  CandidateSkill,
  Resume,
  Job,
  JobSkill,
  JobNiceToHaveSkill,
  Application,
  PasswordReset,
  WorkExperience,
  Project,
  Certification,
  JobSaved,
  BenchResource,
  EmployerPermission,
  // AI Models
  ResumeAnalysis,
  JobMatch,
  Interview,
  Problem,
  Testcase,
  CodingTest,
  CodingTestProblem,
  Submission,
  ProfileView,
  EmployerShortlist,
  EmailVerification,
  initAssociations,
};
