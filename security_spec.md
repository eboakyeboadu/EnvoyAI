# Security Specification for TalentFlow AI

## Data Invariants
1. A user can only read and write their own profile.
2. A user can only see jobs found specifically for them (`/users/{userId}/jobs/{jobId}`).
3. A user can only manage their own applications.
4. Jobs and Applications MUST have valid IDs and required fields.
5. `uid` and `email` in User profile must match the authenticated user.

## The Dirty Dozen Payloads (Rejection Tests)
1. Write to another user's profile: `setDoc('/users/other_uid', { ... })` -> DENIED
2. Create job with 1MB title: `{ "title": "A".repeat(1024*1024) }` -> DENIED
3. Update application status to 'admin': `{ "status": "admin" }` (not in enum) -> DENIED
4. Change `uid` on profile update: `{ "uid": "fake_uid" }` -> DENIED
5. List jobs of another user: `getDocs('/users/other_uid/jobs')` -> DENIED
6. Create job with malicious script in link: `{ "link": "javascript:alert(1)" }` -> DENIED
7. Anonymous write to profile -> DENIED
8. Unverified email write -> DENIED
9. Delete application of another user -> DENIED
10. Update job `fitScore` to be a string: `{ "fitScore": "high" }` -> DENIED
11. Add unknown field to Application: `{ "hacked": true }` -> DENIED
12. Create Job with missing required field `link` -> DENIED

## The Test Runner
(This is a draft/concept file as the actual test runner environment is simulated here)
```ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Test logic would go here, ensuring all above fail cases return PERMISSION_DENIED.
```
