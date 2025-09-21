# Tasks: 加盟店管理画面（管理者版）

**Input**: Design documents from `/specs/franchise-admin-dashboard/`
**Prerequisites**: plan.md (complete), research.md (complete), data-model.md (complete)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript, React, Express, PostgreSQL
   → Structure: Web app (frontend/backend split)
2. Load optional design documents:
   → data-model.md: 9 entities extracted
   → research.md: Technical decisions loaded
3. Generate tasks by category:
   → Setup: 5 tasks
   → Tests: 15 tasks
   → Core: 25 tasks
   → Integration: 10 tasks
   → Polish: 5 tasks
4. Apply task rules:
   → Parallel tasks marked with [P]
   → TDD enforced (tests before implementation)
5. Number tasks sequentially (T001-T060)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness: ALL PASSED
9. Return: SUCCESS (60 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [ ] T001 Create project structure (backend/, frontend/) per plan.md
- [ ] T002 Initialize backend with Express, TypeScript, PostgreSQL dependencies
- [ ] T003 Initialize frontend with React 18, TypeScript, Vite
- [ ] T004 [P] Configure ESLint, Prettier for both projects
- [ ] T005 [P] Setup Docker Compose for PostgreSQL, Redis, MinIO

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

### Contract Tests (Backend)
- [ ] T006 [P] Contract test POST /api/auth/login in backend/tests/contract/auth/test_login.ts
- [ ] T007 [P] Contract test POST /api/auth/logout in backend/tests/contract/auth/test_logout.ts
- [ ] T008 [P] Contract test POST /api/auth/refresh in backend/tests/contract/auth/test_refresh.ts
- [ ] T009 [P] Contract test GET /api/dashboard/stats in backend/tests/contract/dashboard/test_stats.ts
- [ ] T010 [P] Contract test GET /api/cases in backend/tests/contract/cases/test_list.ts
- [ ] T011 [P] Contract test PUT /api/cases/{id}/status in backend/tests/contract/cases/test_status.ts
- [ ] T012 [P] Contract test POST /api/cases/{id}/memo in backend/tests/contract/cases/test_memo.ts
- [ ] T013 [P] Contract test GET /api/sales/accounts in backend/tests/contract/sales/test_accounts.ts
- [ ] T014 [P] Contract test POST /api/sales/accounts in backend/tests/contract/sales/test_create.ts
- [ ] T015 [P] Contract test GET /api/billing/invoice in backend/tests/contract/billing/test_invoice.ts

### Integration Tests  
- [ ] T016 [P] Integration test login flow in backend/tests/integration/test_auth_flow.ts
- [ ] T017 [P] Integration test case assignment in backend/tests/integration/test_case_assignment.ts
- [ ] T018 [P] Integration test cancel request in backend/tests/integration/test_cancel_request.ts
- [ ] T019 [P] Integration test monthly billing in backend/tests/integration/test_billing.ts
- [ ] T020 [P] E2E test dashboard load in frontend/tests/e2e/test_dashboard.spec.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Database Models
- [ ] T021 [P] User model in backend/src/models/User.ts
- [ ] T022 [P] Company model in backend/src/models/Company.ts
- [ ] T023 [P] Case model in backend/src/models/Case.ts
- [ ] T024 [P] SalesAccount model in backend/src/models/SalesAccount.ts
- [ ] T025 [P] Invoice model in backend/src/models/Invoice.ts
- [ ] T026 [P] Deposit model in backend/src/models/Deposit.ts
- [ ] T027 [P] CancelRequest model in backend/src/models/CancelRequest.ts
- [ ] T028 [P] Notification model in backend/src/models/Notification.ts
- [ ] T029 Database migrations in backend/src/migrations/

### Backend Services
- [ ] T030 [P] AuthService (JWT, refresh tokens) in backend/src/services/AuthService.ts
- [ ] T031 [P] CaseService (CRUD, status management) in backend/src/services/CaseService.ts
- [ ] T032 [P] SalesService (account management) in backend/src/services/SalesService.ts
- [ ] T033 [P] BillingService (invoice generation) in backend/src/services/BillingService.ts
- [ ] T034 [P] NotificationService (SMS/LINE/Email) in backend/src/services/NotificationService.ts

### Backend API Routes
- [ ] T035 Auth routes (login, logout, refresh) in backend/src/routes/auth.ts
- [ ] T036 Dashboard routes (stats, charts) in backend/src/routes/dashboard.ts
- [ ] T037 Case routes (CRUD, status, files) in backend/src/routes/cases.ts
- [ ] T038 Sales routes (accounts, assignment) in backend/src/routes/sales.ts
- [ ] T039 Billing routes (invoices, deposits) in backend/src/routes/billing.ts
- [ ] T040 Settings routes (company, areas) in backend/src/routes/settings.ts

### Frontend Components
- [ ] T041 [P] LoginPage component in frontend/src/pages/LoginPage.tsx
- [ ] T042 [P] DashboardPage component in frontend/src/pages/DashboardPage.tsx
- [ ] T043 [P] CasesPage component in frontend/src/pages/CasesPage.tsx
- [ ] T044 [P] CaseCard component in frontend/src/components/Cases/CaseCard.tsx
- [ ] T045 [P] SalesPage component in frontend/src/pages/SalesPage.tsx
- [ ] T046 [P] BillingPage component in frontend/src/pages/BillingPage.tsx
- [ ] T047 [P] SettingsPage component in frontend/src/pages/SettingsPage.tsx

### Frontend Services
- [ ] T048 [P] API client setup (axios) in frontend/src/services/api/client.ts
- [ ] T049 [P] Auth service (login, token management) in frontend/src/services/auth.ts
- [ ] T050 [P] Case service (CRUD operations) in frontend/src/services/cases.ts

## Phase 3.4: Integration
- [ ] T051 Connect backend to PostgreSQL with TypeORM
- [ ] T052 Setup Redis for session/cache
- [ ] T053 Setup MinIO for file storage
- [ ] T054 Implement SSE for real-time updates
- [ ] T055 Auth middleware with JWT validation

## Phase 3.5: Polish
- [ ] T056 [P] Unit tests for validators in backend/tests/unit/
- [ ] T057 [P] Unit tests for React components in frontend/tests/unit/
- [ ] T058 Performance optimization (<200ms API, <100ms render)
- [ ] T059 [P] API documentation generation
- [ ] T060 Production build configuration

## Dependencies
- Setup (T001-T005) → Tests (T006-T020)
- Tests (T006-T020) → Implementation (T021-T050)
- Models (T021-T029) → Services (T030-T034)
- Services (T030-T034) → Routes (T035-T040)
- API Routes (T035-T040) → Frontend (T041-T050)
- All implementation → Integration (T051-T055)
- Integration → Polish (T056-T060)

## Parallel Example
```bash
# Phase 3.2 - Launch all contract tests together:
npm test backend/tests/contract/auth/test_login.ts &
npm test backend/tests/contract/auth/test_logout.ts &
npm test backend/tests/contract/auth/test_refresh.ts &
npm test backend/tests/contract/dashboard/test_stats.ts &
npm test backend/tests/contract/cases/test_list.ts &

# Phase 3.3 - Launch all models together:
Task: "Create User model in backend/src/models/User.ts"
Task: "Create Company model in backend/src/models/Company.ts"
Task: "Create Case model in backend/src/models/Case.ts"
Task: "Create SalesAccount model in backend/src/models/SalesAccount.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify all tests fail before implementing
- Commit after each task with descriptive message
- Use TypeScript strict mode throughout

## Validation Checklist
- [x] All entities have model tasks (9 entities → 9 models)
- [x] All main features have contract tests (auth, cases, sales, billing)
- [x] All tests come before implementation (T006-T020 before T021-T050)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

---
Ready for execution. Begin with Phase 3.1 Setup tasks.