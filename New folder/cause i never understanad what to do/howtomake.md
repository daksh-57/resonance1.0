Build a complete, production-ready full-stack web application called **ReconcileAI — Intelligent Digital Record Reconciliation Platform** from scratch.
make a readme after reading everything that tells the other coding assistant how to build it and make as much as u can
This is a complete implementation of:

**PS 3 — Intelligent Reconciliation of Conflicting Digital Records**

Do NOT build only a UI prototype or mockup. Build the actual working application, including frontend, backend, database, authentication, file storage, data processing, reconciliation engine, audit trail, APIs, sample data, security, error handling, deployment configuration, and documentation.

The application must be usable from the browser after deployment.

==================================================

1. PRODUCT OBJECTIVE
   ==================================================

Build a platform that allows organizations to upload or connect records from multiple data sources such as:

* CRM
* ERP
* Billing
* HR
* CSV files
* Excel files
* JSON files
* REST APIs

The platform must:

1. Ingest records from multiple sources.
2. Preserve every original source record.
3. Normalize the data.
4. Detect probable duplicate entities across sources.
5. Group records belonging to the same real-world entity.
6. Detect field-level conflicts.
7. Calculate match/conflict confidence.
8. Recommend the best canonical value.
9. Explain why that value was selected.
10. Automatically resolve high-confidence conflicts.
11. Send low-confidence conflicts to human review.
12. Allow users to approve/reject/change recommendations.
13. Generate a canonical unified record.
14. Preserve complete source history.
15. Maintain an immutable-style audit trail.
16. Learn from human decisions during Phase 4.
17. Provide dashboards, analytics and reports.
18. Provide APIs for future integrations.
19. Be deployable as a real web application.

The central principle is:

**RECONCILE, DON'T OVERWRITE.**

Never destroy the original source data.

==================================================
2. DEVELOPMENT APPROACH
=======================

Build the application in four phases while keeping everything integrated.

PHASE 1:
Data ingestion + normalization + duplicate detection.

PHASE 2:
Conflict detection + confidence scoring + configurable source priorities.

PHASE 3:
Canonical records + human review + evidence + complete audit history.

PHASE 4:
Machine-learning-assisted matching + learning from human decisions + APIs + scheduled ingestion + advanced analytics.

Do not create four separate applications.

Create ONE application whose capabilities progressively include all four phases.

==================================================
3. TECHNOLOGY
=============

Use the most reliable technologies supported by the platform.

Preferred architecture:

Frontend:

* React
* TypeScript
* modern component-based architecture
* responsive design
* Tailwind CSS or equivalent
* accessible UI

Backend:

* TypeScript/Node.js OR Python/FastAPI depending on what the platform supports best
* REST API
* background processing for large imports

Database:

* PostgreSQL

Authentication:

* secure email/password authentication
* session/token based authentication
* password hashing
* protected routes
* logout
* password reset if supported

File storage:

* persistent object/file storage
* uploaded CSV/XLSX/JSON files must not disappear after refresh
* store file metadata in PostgreSQL
* store actual files in persistent storage

Queue/background processing:

* use the platform's supported background jobs/queue mechanism where available

AI/ML:

* design the reconciliation engine so that deterministic algorithms work without an external AI API
* optionally support an LLM provider through an environment variable
* never make the entire application dependent on an unavailable API key
* if an AI API is unavailable, fall back to deterministic reconciliation

Deployment:

* configure the application for production deployment
* configure environment variables
* configure database
* configure file storage
* provide deployment documentation
* ensure the deployed URL works end-to-end

==================================================
4. AUTHENTICATION
=================

Implement complete authentication.

Pages:

/login
/register
/forgot-password
/reset-password
/dashboard

Registration:

* Name
* Email
* Password
* Confirm password

Requirements:

* secure password hashing
* email uniqueness
* validation
* proper error messages
* session management
* protected application routes
* logout
* prevent unauthenticated access to application data

Each user's uploaded datasets, reconciliation jobs, conflicts, decisions and files must be associated with their user/account.

Add basic authorization so users cannot access another user's records.

==================================================
5. DATABASE
===========

Create a proper relational PostgreSQL schema.

At minimum create:

users
organizations
sources
datasets
uploaded_files
source_records
normalized_records
entities
entity_matches
field_values
conflicts
reconciliation_decisions
canonical_records
canonical_field_values
audit_events
review_tasks
source_field_rules
reconciliation_jobs
job_logs
model_feedback
api_keys
scheduled_imports
notifications

Use UUIDs or equivalent secure identifiers.

Add:

* primary keys
* foreign keys
* indexes
* timestamps
* created_by/user relationships
* organization relationships where appropriate
* status fields
* appropriate constraints

Do not put the entire application into one JSON column.

Use relational tables for important searchable data while retaining raw source data as JSON where useful.

==================================================
6. MULTI-TENANCY / USER ISOLATION
=================================

Design the application so it can support multiple organizations.

Every organization should have isolated data.

Users belong to organizations.

At minimum implement:

Organization
→ Users
→ Sources
→ Datasets
→ Records
→ Entities
→ Conflicts
→ Decisions

A user must never be able to retrieve another organization's data by manipulating an ID in the URL or API.

==================================================
7. DATA SOURCE MANAGEMENT
=========================

Create a Sources page.

Users can create sources such as:

CRM
ERP
Billing
HR
Other

Source fields:

* Name
* Type
* Description
* Reliability score
* Active/inactive
* Created date

Example:

CRM
Reliability: 90

ERP
Reliability: 85

Billing
Reliability: 70

Allow users to modify reliability.

Also allow field-specific authority.

Example:

CRM:
phone = 95
email = 95
name = 90

ERP:
address = 95

Billing:
payment_status = 100

HR:
salary = 100

==================================================
8. FILE UPLOAD
==============

Create a professional upload workflow.

Supported:

CSV
XLSX
JSON

Upload process:

Step 1:
Choose source.

Step 2:
Upload file.

Step 3:
Preview records.

Step 4:
Detect columns.

Step 5:
Allow field mapping.

Example:

CSV column:
customer_name

Map to:
name

CSV:
mobile_number

Map to:
phone

CSV:
email_address

Map to:
email

CSV:
location

Map to:
address

Step 6:
Validate.

Step 7:
Import.

Step 8:
Show processing progress.

Step 9:
Show results.

Show:

* rows processed
* valid rows
* invalid rows
* duplicates detected
* conflicts detected
* errors

Preserve the original uploaded file.

==================================================
9. DATA NORMALIZATION
=====================

Implement real normalization.

Names:

"Raj Kumar"
"RAJ KUMAR"
"Rajkumar"
"Raj Kumar "

should become comparable representations.

Email:

convert to lowercase
trim whitespace

Phone:

remove spaces
remove punctuation
normalize country code where possible

Address:

trim
normalize casing
remove unnecessary punctuation
normalize common abbreviations where practical

Dates:

convert to a standard format.

Numbers:

normalize currency/number formats where appropriate.

Do NOT modify the original raw source record.

Store:

raw value
normalized value

separately.

==================================================
10. ENTITY RESOLUTION
=====================

Implement actual duplicate/entity matching.

Example:

CRM:
Raj Kumar
[raj@gmail.com](mailto:raj@gmail.com)
9876543210
Chennai

ERP:
Rajkumar
[raj@gmail.com](mailto:raj@gmail.com)
9876543210
Chennai

Billing:
R. Kumar
[raj@gmail.com](mailto:raj@gmail.com)
9876543210
Chennai

The application should determine that these probably represent one entity.

Use multiple matching signals:

* exact email
* normalized email
* phone
* normalized phone
* name similarity
* address similarity
* date of birth where available
* customer ID where available
* organization/company
* other configured identifiers

Implement fuzzy matching using an appropriate algorithm/library.

Example conceptual score:

Name similarity: 35%
Email: 30%
Phone: 20%
Address: 15%

Do not hard-code these percentages everywhere.

Store matching configuration in a configurable structure.

Generate:

match_score
match_reason
matched_fields
confidence
status

Example:

98.7% match

Reasons:

* Exact email match
* Exact phone match
* High name similarity
* High address similarity

==================================================
11. DUPLICATE GROUPS
====================

Create a Duplicate Groups page.

Example:

Entity Group #1042

Possible records:

CRM — Record 1001
ERP — Record 4421
Billing — Record 7821

Display:

Match confidence: 98.7%

Matched fields:

✓ Email
✓ Phone
✓ Name
✓ Address

Allow the user to:

* view group
* confirm match
* reject match
* split records
* merge records into an entity

Never delete the underlying source records.

==================================================
12. CONFLICT DETECTION
======================

After grouping records into the same entity, compare field values.

Example:

CRM:
Phone = 9876543210

ERP:
Phone = 9876543210

Billing:
Phone = 9123456780

Detect:

PHONE CONFLICT

Similarly detect conflicts in:

* name
* phone
* email
* address
* status
* date of birth
* company
* payment status
* custom fields

Do not treat missing values as conflicts.

==================================================
13. CONFLICT SEVERITY
=====================

Assign:

LOW
MEDIUM
HIGH
CRITICAL

based on:

* field importance
* number of conflicting sources
* reliability
* confidence
* business rules

Example:

Payment status conflict:
HIGH

Name formatting difference:
LOW

Phone conflict:
MEDIUM/HIGH

==================================================
14. RECONCILIATION ENGINE
=========================

Build the core reconciliation engine.

For each conflicting field:

1. Collect all candidate values.
2. Calculate source reliability.
3. Calculate recency.
4. Calculate agreement between sources.
5. Calculate completeness.
6. Check field-specific authority.
7. Check historical consistency.
8. Calculate final confidence.
9. Recommend canonical value.
10. Generate explanation.

Example:

CRM:
9876543210
Reliability: 95
Updated: 2 days ago

ERP:
9876543210
Reliability: 85
Updated: 10 days ago

Billing:
9123456780
Reliability: 60
Updated: 18 months ago

Recommendation:

9876543210

Confidence:
96%

Explanation:

"CRM and ERP agree on the phone number. CRM has the highest configured authority for customer contact information. The Billing value is significantly older."

Store this explanation.

==================================================
15. FIELD-LEVEL SOURCE AUTHORITY
================================

Do not assume one source is globally authoritative.

Allow:

CRM → phone
ERP → address
Billing → payment status
HR → employee salary

Create a UI:

Source Priority Rules

Field:
Phone

1. CRM
2. ERP
3. Billing

Field:
Address

1. ERP
2. CRM
3. Billing

Allow users to change priorities.

==================================================
16. CONFIDENCE LEVELS
=====================

Use:

90–100:
HIGH

70–89:
MEDIUM

0–69:
LOW

Configurable thresholds.

Default:

> = 90:
> automatically resolve

70–89:
recommend + optional review

< 70:
mandatory human review

==================================================
17. HUMAN REVIEW
================

Create a Review Queue.

Show:

Conflict ID
Entity
Field
Values
Recommended value
Confidence
Reason
Status
Created date

Example:

Raj Kumar
Phone

CRM:
9876543210

ERP:
9876543210

Billing:
9123456780

AI recommendation:
9876543210

Confidence:
96%

Buttons:

APPROVE
REJECT
CHOOSE VALUE
EDIT VALUE
MERGE
SPLIT
INVESTIGATE

If user chooses a different value, record it as feedback.

Never silently overwrite previous decisions.

==================================================
18. CANONICAL RECORD
====================

After reconciliation, generate a canonical record.

Example:

Raj Kumar

Email:
[raj@gmail.com](mailto:raj@gmail.com)

Phone:
9876543210

Address:
Chennai

Status:
Active

Each canonical field must know:

* selected value
* source
* confidence
* decision
* timestamp

Allow users to see evidence for every field.

Example:

Phone
9876543210

Source:
CRM

Confidence:
96%

Evidence:
CRM + ERP agreement

==================================================
19. EVIDENCE VIEW
=================

Every canonical value should have an Evidence panel.

Example:

PHONE

Canonical:
9876543210

Evidence:

CRM
9876543210
Updated 2 days ago

ERP
9876543210
Updated 10 days ago

Billing
9123456780
Updated 18 months ago

Decision:
CRM value selected.

Reason:
Two sources agree and CRM has highest field authority.

==================================================
20. AUDIT TRAIL
===============

Create a complete audit log.

Record events such as:

USER_REGISTERED
SOURCE_CREATED
FILE_UPLOADED
DATA_IMPORTED
RECORD_NORMALIZED
ENTITY_MATCHED
DUPLICATE_CONFIRMED
CONFLICT_DETECTED
CONFLICT_AUTO_RESOLVED
REVIEW_STARTED
DECISION_APPROVED
DECISION_REJECTED
CANONICAL_RECORD_CREATED
CANONICAL_RECORD_UPDATED
SOURCE_RULE_CHANGED
API_KEY_CREATED
SCHEDULE_CREATED

Each audit event should contain:

* actor
* organization
* timestamp
* entity
* action
* old value where relevant
* new value where relevant
* reason
* source
* metadata

Create an Audit Trail page with filters.

==================================================
21. DASHBOARD
=============

Create a polished SaaS dashboard.

Show:

Total Records
Entities
Duplicate Groups
Conflicts
Auto Resolved
Needs Review
Resolution Rate
Average Confidence

Charts:

Records by source
Conflicts over time
Resolution status
Conflict severity
Source contribution
Match confidence distribution

Recent activity:

* uploaded dataset
* detected conflicts
* resolved records
* reviewer decisions

==================================================
22. PAGES
=========

Implement these pages:

/login
/register
/forgot-password
/dashboard
/sources
/sources/new
/datasets
/datasets/:id
/upload
/entities
/entities/:id
/duplicates
/duplicates/:id
/conflicts
/conflicts/:id
/review
/review/:id
/canonical-records
/canonical-records/:id
/audit
/analytics
/rules
/settings
/api
/schedules

Use protected routing.

==================================================
23. ENTITY DETAIL PAGE
======================

Create an excellent entity detail page.

Header:

Entity #1042
Raj Kumar

Status:
Reconciled

Confidence:
96%

Sections:

Canonical Record
Source Records
Conflicts
Evidence
History
Audit Trail

Source Records:

CRM
ERP
Billing

Allow users to expand each original record.

==================================================
24. CONFLICT DETAIL PAGE
========================

Make conflict resolution visually clear.

Use a comparison table:

Field | CRM | ERP | Billing | Recommendation

Show conflicting values clearly.

Display:

Confidence
Severity
Reason
Evidence
Source reliability
Last updated

Actions:

Approve
Reject
Choose CRM
Choose ERP
Choose Billing
Enter custom value

==================================================
25. SAMPLE DATA
===============

Create realistic demo datasets.

At minimum create:

CRM.csv
ERP.csv
Billing.csv

Include at least 50–100 sample records.

Include:

* exact duplicates
* fuzzy duplicates
* formatting differences
* missing values
* conflicting phone numbers
* conflicting addresses
* conflicting statuses
* stale records
* records that should NOT match

Example:

CRM:

Raj Kumar
[raj@gmail.com](mailto:raj@gmail.com)
9876543210
Chennai

ERP:

Rajkumar
[raj@gmail.com](mailto:raj@gmail.com)
9876543210
Chennai

Billing:

R. Kumar
[raj@gmail.com](mailto:raj@gmail.com)
9123456780
Chennai

Make sure the demo produces meaningful duplicate and conflict results.

Add a "Load Demo Data" button.

==================================================
26. IMPORT JOB PROCESSING
=========================

Imports may contain thousands of rows.

Do not block the UI for large imports.

Create processing jobs.

Statuses:

QUEUED
PROCESSING
COMPLETED
FAILED
CANCELLED

Show progress.

Example:

Importing CRM.csv

████████████░░░░ 76%

7,600 / 10,000 records

Allow users to see job logs.

==================================================
27. ERROR HANDLING
==================

Handle:

* invalid CSV
* malformed JSON
* invalid XLSX
* missing columns
* duplicate headers
* invalid emails
* invalid phone numbers
* database failures
* storage failures
* processing failures
* authentication failures
* API failures

Never crash the whole application because one record is malformed.

Store row-level errors.

==================================================
28. SEARCH
==========

Add global search.

Search:

* entity
* name
* email
* phone
* source record ID
* conflict ID

Use indexed database queries.

==================================================
29. FILTERING
=============

Add filters for:

Source
Date
Confidence
Severity
Status
Entity
Conflict type
Reviewer
Resolution method

Allow sorting and pagination.

==================================================
30. EXPORT
==========

Allow users to export:

Canonical records
Conflicts
Duplicate groups
Audit events
Reconciliation decisions

Support CSV.

Never export another organization's data.

==================================================
31. API
=======

Build REST APIs.

Example endpoints:

POST /api/sources
GET /api/sources

POST /api/datasets
GET /api/datasets

POST /api/imports
GET /api/imports/:id

GET /api/entities
GET /api/entities/:id

GET /api/conflicts
GET /api/conflicts/:id

POST /api/conflicts/:id/resolve

GET /api/canonical-records
GET /api/canonical-records/:id

GET /api/audit

Use authentication.

Document APIs.

Create an API page in the application.

==================================================
32. API KEYS
============

Allow users/admins to generate API keys.

Display the key only when created.

Store only a secure hash of the key where possible.

Allow:

Create
Revoke
Rotate

Track:

created_at
last_used
status

==================================================
33. SCHEDULED IMPORTS
=====================

PHASE 4:

Create scheduled import support.

Allow:

Daily
Weekly
Hourly
Custom schedule

For supported API/data sources, allow:

Endpoint
Authentication configuration
Schedule
Source
Field mapping

Run imports automatically.

Store job history.

Do not store secrets in plaintext.

==================================================
34. MACHINE LEARNING
====================

PHASE 4 should introduce learning from human decisions.

Store:

Features
Initial prediction
Recommended value
Human decision
Final value
Confidence

Create a feedback dataset.

Use previous decisions to improve matching/reconciliation.

Start with a practical approach rather than an unnecessarily complex deep-learning system.

Possible approach:

* deterministic matching
* weighted fuzzy similarity
* logistic regression / gradient boosting for match probability
* reviewer feedback

Create a model version.

Store:

model_version
training_date
training_records
accuracy/precision/recall if measurable

Do not claim that the model is trained unless actual training has occurred.

==================================================
35. EXPLAINABLE AI
==================

Every AI recommendation must be explainable.

Never show only:

"AI says this is correct."

Instead show:

Recommendation:
9876543210

Confidence:
96%

Why:

1. CRM and ERP agree.
2. CRM has highest authority for phone numbers.
3. CRM record was updated recently.
4. Billing value is significantly older.

Make explanations understandable to non-technical users.

==================================================
36. OPTIONAL LLM INTEGRATION
============================

Architect an optional LLM service.

If an LLM API key is configured, it can assist with:

* ambiguous entity matching
* natural-language explanations
* address semantic comparison
* complex conflict explanations

But deterministic reconciliation must continue working without an LLM.

Use environment variables for API keys.

Never hard-code API keys.

==================================================
37. SECURITY
============

Implement:

* password hashing
* secure authentication
* authorization
* organization-level data isolation
* input validation
* SQL injection protection
* XSS protection
* CSRF protection where applicable
* rate limiting for sensitive endpoints
* file type validation
* file size limits
* secure file access
* secure API keys
* secret management through environment variables

Do not expose database credentials to the frontend.

==================================================
38. UI / UX
===========

Design should look like a modern enterprise SaaS product.

Style:

* clean
* professional
* minimal
* modern
* data-focused
* responsive
* accessible

Use:

Sidebar navigation
Top navigation
Cards
Tables
Charts
Status badges
Tabs
Modals
Drawers
Toast notifications
Progress indicators

Important actions should be obvious.

The conflict comparison screen is the most important screen in the application.

Make it excellent.

==================================================
39. RESPONSIVE DESIGN
=====================

The application must work on:

Desktop
Laptop
Tablet
Mobile

Tables should become horizontally scrollable or transform into cards on small screens.

==================================================
40. EMPTY STATES
================

Create useful empty states.

Example:

"No conflicts found"

"Upload data sources to begin reconciliation."

Provide a button:

Upload Dataset

==================================================
41. LOADING STATES
==================

Every asynchronous action needs a loading state.

Examples:

Uploading...
Processing...
Finding duplicates...
Detecting conflicts...
Generating canonical record...

Do not leave blank screens.

==================================================
42. DEMO MODE
=============

Create a demo mode.

On first login or from dashboard:

"Load Demo Dataset"

This should populate:

CRM
ERP
Billing

Then automatically process them.

The demo should show:

Duplicate groups
Conflicts
Canonical records
Audit events

This is extremely important for demonstrating the project.

==================================================
43. SETTINGS
============

Settings should include:

Profile
Organization
Source Reliability
Matching Configuration
Conflict Thresholds
Field Priorities
Notifications
API Keys
Security

Allow administrators to configure:

duplicate threshold
auto-resolution threshold
review threshold
field weights
source authority

==================================================
44. NOTIFICATIONS
=================

Implement notifications for:

Import completed
Import failed
High-severity conflict detected
Review required
Auto-resolution completed
Scheduled import completed

Create an in-app notification center.

==================================================
45. PERFORMANCE
===============

Optimize for large datasets.

Use:

Pagination
Database indexes
Batch inserts
Background processing
Caching where appropriate
Debouncing
Lazy loading

Do not load 100,000 records into the browser at once.

==================================================
46. TESTING
===========

Create tests for:

Authentication
Authorization
File upload
Normalization
Entity matching
Duplicate detection
Conflict detection
Reconciliation
Confidence calculation
Canonical record creation
Audit trail
Organization isolation
API authentication

Create test fixtures using the sample data.

==================================================
47. SEED / INITIALIZATION
=========================

Create database migrations.

Create seed data.

Provide:

Development seed
Demo seed

Make it possible to initialize the application from a clean database.

==================================================
48. DOCUMENTATION
=================

Create:

README.md

Include:

Project overview
Architecture
Technology stack
Database design
Environment variables
Local development
Database setup
File storage setup
Running migrations
Running seed data
Running tests
Deployment
API documentation
Security
Reconciliation algorithm
Phase 1
Phase 2
Phase 3
Phase 4

Also create:

ARCHITECTURE.md

API.md

RECONCILIATION.md

DEPLOYMENT.md

==================================================
49. ENVIRONMENT VARIABLES
=========================

Create a proper .env.example.

Include placeholders such as:

DATABASE_URL
AUTH_SECRET
STORAGE_BUCKET
STORAGE_ENDPOINT
LLM_API_KEY
API_BASE_URL

Never commit real secrets.

==================================================
50. DEPLOYMENT
==============

Prepare the application for real web deployment.

Configure:

Frontend
Backend
PostgreSQL
File storage
Environment variables
Migrations
Background jobs

The final deployed application must:

* load correctly
* allow registration
* allow login
* allow file upload
* persist data
* process datasets
* detect duplicates
* detect conflicts
* resolve records
* display audit history
* work after refresh
* work for a new user

Do not leave deployment as an instruction-only mockup.

Actually configure everything supported by the platform for deployment.

If deployment requires me to provide a secret, credential, domain, API key or external connection, clearly identify the exact item I need to provide and where I should put it.

==================================================
51. PRODUCTION CHECKLIST
========================

Before declaring the project complete, verify:

[ ] Authentication works
[ ] Registration works
[ ] Login works
[ ] Logout works
[ ] Protected routes work
[ ] User isolation works
[ ] Organization isolation works
[ ] Database persists
[ ] File storage persists
[ ] CSV upload works
[ ] XLSX upload works
[ ] JSON upload works
[ ] Field mapping works
[ ] Normalization works
[ ] Duplicate detection works
[ ] Entity resolution works
[ ] Conflict detection works
[ ] Confidence scoring works
[ ] Source priorities work
[ ] Automatic resolution works
[ ] Human review works
[ ] Canonical records work
[ ] Evidence works
[ ] Audit trail works
[ ] Search works
[ ] Filtering works
[ ] Export works
[ ] API works
[ ] API authentication works
[ ] Demo data works
[ ] Background processing works
[ ] Error handling works
[ ] Responsive UI works
[ ] Tests exist
[ ] Documentation exists
[ ] Environment configuration exists
[ ] Production deployment is configured

==================================================
52. IMPORTANT IMPLEMENTATION RULES
==================================

DO NOT:

* build fake buttons
* use placeholder reconciliation results
* hard-code demo results into the UI
* delete source records
* overwrite source history
* expose secrets
* expose database credentials
* create fake AI claims
* pretend an ML model is trained when it is not
* rely entirely on an external LLM
* use only frontend logic for security
* put all data into one unstructured JSON blob
* skip authentication
* skip authorization
* skip audit logging

DO:

* build real backend functionality
* use a real PostgreSQL database
* use persistent file storage
* preserve raw source records
* make reconciliation deterministic and reproducible
* make decisions explainable
* record every decision
* use background processing for imports
* provide human review
* make thresholds configurable
* make source authority configurable
* make the application production deployable

==================================================
53. FINAL USER EXPERIENCE
=========================

The final user journey should be:

1. User opens ReconcileAI.
2. User registers/logs in.
3. User reaches Dashboard.
4. User creates sources:
   CRM
   ERP
   Billing
5. User uploads datasets.
6. System validates and previews files.
7. User maps columns.
8. System imports data.
9. System normalizes records.
10. System detects duplicate entities.
11. System detects conflicts.
12. System calculates confidence.
13. High-confidence conflicts are automatically resolved.
14. Low-confidence conflicts appear in Review Queue.
15. User reviews a conflict.
16. User sees all source values.
17. User sees evidence.
18. User sees AI recommendation.
19. User approves or changes it.
20. System creates/updates canonical record.
21. Audit trail records the decision.
22. Dashboard updates.
23. User can export canonical records.
24. User can inspect original source records.
25. User can configure source authority.
26. User can configure matching thresholds.
27. User can generate API keys.
28. User can create scheduled imports.
29. Human decisions become feedback for Phase 4.
30. System progressively improves its matching/reconciliation model.

==================================================
54. FINAL BUILD INSTRUCTION
===========================

Start by creating the complete application architecture and database schema.

Then implement the application in the following order:

1. Project foundation
2. Database
3. Authentication
4. Organization/user isolation
5. File storage
6. Source management
7. Dataset upload
8. Data normalization
9. Entity resolution
10. Duplicate detection
11. Conflict detection
12. Reconciliation engine
13. Confidence scoring
14. Canonical records
15. Human review
16. Evidence system
17. Audit trail
18. Dashboard
19. Search/filter/export
20. API
21. API keys
22. Scheduled imports
23. ML feedback loop
24. Optional LLM integration
25. Testing
26. Documentation
27. Production configuration
28. Deployment

After each major component, test it before moving to the next component.

Do not stop after creating the UI.

Continue until the application is a complete working implementation.

If the platform has limitations, choose the closest production-ready supported alternative and clearly document the decision.

At the end, provide a concise implementation summary containing:

* What was built
* Database tables
* Main APIs
* Reconciliation algorithm
* Authentication mechanism
* Storage mechanism
* Phase 1 features
* Phase 2 features
* Phase 3 features
* Phase 4 features
* Tests completed
* Deployment status
* Required environment variables
* Any remaining manual configuration

The final result must be a functioning web application, not merely a design. once the readme is done start building
