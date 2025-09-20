# Implementation Plan: 本部管理画面 (Admin Dashboard)

**Branch**: `admin-dashboard` | **Date**: 2025-01-11 | **Spec**: `/spec.md`
**Input**: Feature specification from `/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from spec.md
   → Found: Headquarters management system specification
2. Fill Technical Context
   → Detect Project Type: web (frontend+backend)
   → Set Structure Decision: Option 2 (Web application)
3. Evaluate Constitution Check
   → Simplicity: Using Vue.js/Express directly
   → Architecture: Features as modular components
4. Execute Phase 0 → research.md
   → Research Vue.js 3 best practices
   → Research real-time updates with WebSocket
5. Execute Phase 1 → contracts, data-model.md, quickstart.md
6. Re-evaluate Constitution Check
   → All checks pass
7. Plan Phase 2 → Task generation approach defined
8. STOP - Ready for /tasks command
```

## Summary
塗装業フランチャイズネットワークの本部管理システム。AIを活用した案件振り分け、2層ステータス管理、財務処理、ランキング評価を統合。gaihekikuraberu.com/admin/#/assignmentの機能を参考に実装。

## Technical Context
**Language/Version**: TypeScript 4.9+, Node.js 18+  
**Primary Dependencies**: Vue.js 3, Express.js, Chart.js, Tailwind CSS  
**Storage**: PostgreSQL for persistence, Redis for caching  
**Testing**: Vitest for unit/integration, Playwright for E2E  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)  
**Project Type**: web - Frontend SPA + Backend API  
**Performance Goals**: <200ms page load, real-time updates via WebSocket  
**Constraints**: Must handle 100+ concurrent users, 10k+ cases/month  
**Scale/Scope**: 50+ franchises, 5 HQ staff users, 10 main screens

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 2 (frontend, backend)
- Using framework directly? Yes - Vue.js and Express without wrappers
- Single data model? Yes - shared TypeScript interfaces
- Avoiding patterns? Yes - direct service calls, no unnecessary abstractions

**Architecture**:
- EVERY feature as library? Components are modular and reusable
- Libraries listed:
  - case-assignment: AI-powered case distribution
  - status-manager: 2-layer status tracking
  - financial-calc: Fee calculation and invoicing
  - ranking-engine: Performance evaluation
- CLI per library: Admin CLI for management tasks
- Library docs: Component documentation in Storybook format

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? PostgreSQL and Redis in tests
- Integration tests for: API endpoints, status transitions, calculations

**Observability**:
- Structured logging included? Yes - Winston for backend
- Frontend logs → backend? Yes - centralized error tracking
- Error context sufficient? Stack traces + user context

**Versioning**:
- Version number assigned? 1.0.0
- BUILD increments on every change? CI/CD auto-increment
- Breaking changes handled? API versioning strategy

## Project Structure

### Documentation (this feature)
```
admin-dashboard/
├── spec.md              # Feature specification
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
# Option 2: Web application
backend/
├── src/
│   ├── models/
│   │   ├── case.model.ts
│   │   ├── franchise.model.ts
│   │   ├── assignment.model.ts
│   │   └── transaction.model.ts
│   ├── services/
│   │   ├── ai-assignment.service.ts
│   │   ├── status.service.ts
│   │   ├── financial.service.ts
│   │   └── ranking.service.ts
│   └── api/
│       ├── routes/
│       ├── middleware/
│       └── websocket/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── CaseAssignment/
│   │   ├── StatusManager/
│   │   ├── Financial/
│   │   └── Ranking/
│   ├── pages/
│   │   ├── DashboardPage.vue
│   │   ├── AssignmentPage.vue
│   │   ├── CasesPage.vue
│   │   ├── FranchisesPage.vue
│   │   └── FinancialPage.vue
│   └── services/
│       ├── api.service.ts
│       ├── websocket.service.ts
│       └── auth.service.ts
└── tests/
    ├── component/
    ├── integration/
    └── e2e/
```

**Structure Decision**: Option 2 - Web application with separate frontend/backend

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - Vue.js 3 Composition API best practices
   - WebSocket implementation for real-time updates
   - AI integration patterns for case assignment
   - Chart.js with Vue.js integration

2. **Generate and dispatch research agents**:
   ```
   Task: "Research Vue.js 3 Composition API patterns for admin dashboards"
   Task: "Find best practices for WebSocket in Express.js"
   Task: "Research AI scoring algorithms for assignment systems"
   Task: "Investigate Chart.js Vue.js wrapper libraries"
   ```

3. **Consolidate findings** in `research.md`:
   - Decision: Vue.js 3 with Composition API
   - Rationale: Better TypeScript support, cleaner component logic
   - Alternatives: Options API (rejected for complexity at scale)

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Case: id, customerId, details, status, building_type
   - Franchise: id, name, area, handicap, preferences
   - Assignment: caseId, franchiseId, aiScore, manualAdjustment
   - StatusHistory: entityId, hqStatus, franchiseStatus, timestamp
   - Transaction: caseId, amount, feeRate, invoiceStatus

2. **Generate API contracts** from functional requirements:
   - POST /api/cases/assign - AI-powered assignment
   - PUT /api/cases/{id}/status - Status update
   - GET /api/dashboard/metrics - KPI data
   - GET /api/ranking/current - Franchise rankings
   - POST /api/financial/calculate-fees - Fee calculation

3. **Generate contract tests** from contracts:
   - test-assign-case.spec.ts
   - test-status-update.spec.ts
   - test-dashboard-metrics.spec.ts
   - test-ranking-calculation.spec.ts
   - test-fee-calculation.spec.ts

4. **Extract test scenarios** from user stories:
   - New case assignment flow
   - Status transition validation
   - Fee calculation with building types
   - Ranking with handicap system

5. **Update CLAUDE.md incrementally**:
   - Add Vue.js 3 patterns
   - Add WebSocket configuration
   - Add testing approach

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Generate ~40 tasks covering all components
- Each major component gets setup → test → implementation tasks
- API endpoints: contract test → implementation → integration test
- Frontend components: unit test → implementation → E2E test

**Ordering Strategy**:
- Backend models and services first
- API endpoints next
- Frontend components parallel with API
- Integration and E2E tests last

**Estimated Output**: 40-45 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md)  
**Phase 5**: Validation (run all tests, verify against gaihekikuraberu.com reference)

## Complexity Tracking
*No violations - system follows all constitutional principles*

## Progress Tracking
*This checklist is updated during execution flow*

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
*Based on Constitution v2.1.1 - Using Spec Kit methodology*