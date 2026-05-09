# Business User Permission Model (HR & Employer)

> [!IMPORTANT]
> **Role-Based Access Control**: Business users (HR and Employer) have different permission levels based on their `role` and the `canPostJob` flag. Understanding this is crucial for feature access.

## Permission Matrix

| Feature | HR (no `canPostJob`) | HR (with `canPostJob`) | Employer (no `canPostJob`) | Employer (with `canPostJob`) |
|---------|---------------------|----------------------|--------------------------|------------------------------|
| **Post Jobs** | ❌ | ✅ | ❌ | ✅ |
| **Browse Talent** | ❌ | ✅ | ❌ | ✅ |
| **Add Bench Resources** | ❌ | ❌ | ✅ | ✅ |
| **Manage Own Bench** | ❌ | ❌ | ✅ | ✅ |
| **View Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Update Company Profile** | ✅ | ✅ | ✅ | ✅ |

## Role Definitions

**HR User** (`role: 'hr'`):
- Focused on recruitment and hiring
- Can post jobs and browse talent **only with** `canPostJob: true`
- **Cannot** manage bench resources (employer-specific feature)
- Typically works for a company but doesn't own internal resources

**Employer** (`role: 'employer'`):
- Company owner or manager
- Can **always** manage bench resources (internal talent pool)
- Needs `canPostJob: true` to post jobs and browse all talent
- Owns the company's internal resources

## Middleware Logic

**1. `requireJobPostPermission()`** - Job Posting
```typescript
// Both HR and Employer need canPostJob: true
if (userType === 'business' && user.canPostJob) ✅
```

**2. `requireBenchResourcePermission()`** - Bench Resources
```typescript
// Only Employers allowed (regardless of canPostJob)
if (userType === 'business' && user.role === 'employer') ✅
```

**3. `requireTalentBrowsePermission()`** - Browse Talent
```typescript
// Both HR and Employer need canPostJob: true
if (userType === 'business' && user.canPostJob) ✅
```

## How `canPostJob` is Set

The `canPostJob` flag is set to `false` by default during registration. It can be enabled by:
1. **Admin approval** - System admin updates the flag
2. **Payment verification** - After subscription/payment confirmation
3. **Manual override** - Database update by authorized personnel

## Example Scenarios

**Scenario 1: Free Tier HR User**
```json
{
  "role": "hr",
  "canPostJob": false,
  "capabilities": {
    "postJobs": false,
    "browseTalent": false,
    "manageBenchResources": false,
    "viewDashboard": true
  }
}
```

**Scenario 2: Premium HR User**
```json
{
  "role": "hr",
  "canPostJob": true,
  "capabilities": {
    "postJobs": true,
    "browseTalent": true,
    "manageBenchResources": false,
    "viewDashboard": true
  }
}
```

**Scenario 3: Free Tier Employer**
```json
{
  "role": "employer",
  "canPostJob": false,
  "capabilities": {
    "postJobs": false,
    "browseTalent": false,
    "manageBenchResources": true,
    "viewDashboard": true
  }
}
```

**Scenario 4: Premium Employer**
```json
{
  "role": "employer",
  "canPostJob": true,
  "capabilities": {
    "postJobs": true,
    "browseTalent": true,
    "manageBenchResources": true,
    "viewDashboard": true
  }
}
```

## Use Case Examples

**Use Case 1: Staffing Agency (Employer)**
- Needs to manage internal bench resources ✅
- Wants to post jobs for clients → Needs `canPostJob: true`
- Wants to browse all talent → Needs `canPostJob: true`

**Use Case 2: Corporate HR Department (HR)**
- Needs to post jobs for the company → Needs `canPostJob: true`
- Needs to browse candidates → Needs `canPostJob: true`
- Does NOT manage bench resources (not applicable) ❌

**Use Case 3: Small Business Owner (Employer, Free Tier)**
- Can add their own employees as bench resources ✅
- Cannot post jobs publicly ❌
- Cannot browse external talent ❌
