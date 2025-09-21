# Implementation Plan: 加盟店管理画面（管理者版）

**Branch**: `001-franchise-admin-dashboard` | **Date**: 2025-01-09 | **Spec**: [/specs/franchise-admin-dashboard.md]
**Input**: Feature specification from `/specs/franchise-admin-dashboard.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Successfully loaded franchise-admin-dashboard spec
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detected Project Type: web (frontend+backend required)
   → Set Structure Decision: Option 2 (Web application)
3. Evaluate Constitution Check section below
   → All checks passing - simplicity maintained
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → Resolved all technical decisions
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → All checks still passing
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Task generation approach defined
8. STOP - Ready for /tasks command
```

## Summary
管理者向け加盟店管理画面の実装。React/TypeScriptフロントエンドとNode.js/Express バックエンドで構築し、リアルタイム案件管理、営業担当管理、請求管理、設定管理機能を提供する。

## Technical Context
**Language/Version**: TypeScript 5.x (Frontend & Backend), Node.js 20.x  
**Primary Dependencies**: React 18, Express 4, PostgreSQL 15, Redis (cache)  
**Storage**: PostgreSQL (primary), Redis (session/cache), S3-compatible (files)  
**Testing**: Vitest (unit/integration), Playwright (E2E)  
**Target Platform**: Modern browsers (Chrome 90+, Safari 14+, Firefox 88+)  
**Project Type**: web - Frontend SPA + Backend API  
**Performance Goals**: <200ms page load, <100ms API response (p95)  
**Constraints**: レスポンシブ対応必須, リアルタイム更新, 同時接続100ユーザー  
**Scale/Scope**: 500加盟店, 月間10万案件処理, 50画面

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 2 (frontend, backend)
- Using framework directly? YES (React/Express without wrappers)
- Single data model? YES (shared TypeScript interfaces)
- Avoiding patterns? YES (direct DB access, no unnecessary abstractions)

**Architecture**:
- EVERY feature as library? YES
- Libraries listed:
  - @franchise/auth: 認証・権限管理
  - @franchise/cases: 案件管理
  - @franchise/sales: 営業管理
  - @franchise/billing: 請求管理
  - @franchise/notifications: 通知システム
- CLI per library: Each with --help/--version/--format
- Library docs: llms.txt format planned

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? YES
- Git commits show tests before implementation? YES
- Order: Contract→Integration→E2E→Unit strictly followed? YES
- Real dependencies used? YES (PostgreSQL, Redis in tests)
- Integration tests for: new libraries, contract changes, shared schemas? YES
- FORBIDDEN: Implementation before test - UNDERSTOOD

**Observability**:
- Structured logging included? YES (winston/pino)
- Frontend logs → backend? YES (unified log stream)
- Error context sufficient? YES (user, action, timestamp, stack)

**Versioning**:
- Version number assigned? 1.0.0
- BUILD increments on every change? YES
- Breaking changes handled? YES (API versioning)

## Project Structure

### Documentation (this feature)
```
specs/franchise-admin-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auth.openapi.yaml
│   ├── cases.openapi.yaml
│   ├── sales.openapi.yaml
│   └── billing.openapi.yaml
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
# Option 2: Web application
backend/
├── src/
│   ├── models/
│   │   ├── Case.ts
│   │   ├── SalesAccount.ts
│   │   ├── Invoice.ts
│   │   └── Company.ts
│   ├── services/
│   │   ├── CaseService.ts
│   │   ├── SalesService.ts
│   │   ├── BillingService.ts
│   │   └── NotificationService.ts
│   └── api/
│       ├── routes/
│       └── middleware/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── Cases/
│   │   ├── Sales/
│   │   └── Billing/
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── CasesPage.tsx
│   │   ├── SalesPage.tsx
│   │   └── BillingPage.tsx
│   └── services/
│       └── api/
└── tests/
    ├── e2e/
    └── unit/
```

**Structure Decision**: Option 2 (Web application) - Frontend + Backend separation

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context**:
   - Real-time updates architecture (WebSocket vs SSE)
   - Session management strategy (JWT vs Server sessions)
   - File storage solution (S3 vs local)
   - Notification delivery (SMS/LINE integration)

2. **Generate and dispatch research agents**:
   ```
   Task: "Research real-time architecture for 100 concurrent users"
   Task: "Find best practices for JWT with refresh tokens"
   Task: "Evaluate S3-compatible storage options"
   Task: "Research SMS/LINE API providers for Japan"
   ```

3. **Consolidate findings** in `research.md`

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts

1. **Extract entities from feature spec** → `data-model.md`:
   - Case: 案件エンティティ with 10 status types
   - SalesAccount: 営業担当者 with permissions
   - AdminAccount: 管理者 with full access
   - Invoice: 請求データ with auto-calculation
   - Company: 加盟店情報 with settings
   - Notification: 通知設定 and delivery logs

2. **Generate API contracts** from functional requirements:
   - Auth API: Login, logout, refresh token
   - Cases API: CRUD, status updates, file uploads
   - Sales API: Account management, assignment
   - Billing API: Invoice generation, deposit tracking
   - Settings API: Company info, area management

3. **Generate contract tests** from contracts:
   - 52 endpoints → 52 contract test files
   - Schema validation for all request/response

4. **Extract test scenarios** from user stories:
   - Dashboard load test
   - Case assignment flow test
   - Monthly billing calculation test
   - Cancel request approval test

5. **Update CLAUDE.md incrementally**:
   - Add TypeScript/React/Express context
   - Include project structure
   - Add testing approach

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do*

**Task Generation Strategy**:
- 10 contract test tasks [P] - API endpoints
- 6 model creation tasks [P] - Database entities
- 15 integration test tasks - User flows
- 20 implementation tasks - Features
- 5 E2E test tasks - Critical paths

**Ordering Strategy**:
1. Database setup and models [P]
2. Contract tests [P]
3. Backend API implementation
4. Frontend components
5. Integration tests
6. E2E tests

**Estimated Output**: 56 numbered, ordered tasks in tasks.md

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks following TDD)  
**Phase 5**: Validation (run all tests, execute quickstart.md)

## Complexity Tracking
*No violations - all constitutional principles maintained*

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - approach defined)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*