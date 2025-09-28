# Tasks: 本部管理画面 (Admin Dashboard)

**Input**: Complete specifications and design documents
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/
**Priority**: Case Assignment screen matching gaihekikuraberu.com/admin/#/assignment

## Execution Flow
```
1. Setup Vue 3 project with TypeScript
2. Configure Tailwind CSS and routing
3. Implement Case Assignment (Priority 1)
4. Implement Franchise Management
5. Build Dashboard with real-time updates
6. Add Financial and Ranking systems
7. Integrate with GAS backend
8. Complete testing and documentation
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Tasks follow TDD approach: tests before implementation

## Path Conventions
- **Frontend**: `frontend/src/`
- **Backend**: `backend/src/` (GAS integration layer)
- **Tests**: `frontend/tests/`, `backend/tests/`

## Phase 1: Project Setup & Configuration
- [ ] T001 Initialize Vue 3 project with TypeScript in frontend/
- [ ] T002 Install and configure Tailwind CSS with admin theme
- [ ] T003 [P] Setup Vue Router with hash mode for compatibility
- [ ] T004 [P] Configure Pinia for state management
- [ ] T005 [P] Setup axios for API calls to GAS backend
- [ ] T006 Create project structure matching existing system
- [ ] T007 [P] Configure ESLint and Prettier for code quality
- [ ] T008 [P] Setup environment variables for API endpoints

## Phase 2: Layout & Navigation Components
- [ ] T009 Create MainLayout.vue with left sidebar (7 menu items)
- [ ] T010 [P] Create SidebarMenu.vue component with icons
- [ ] T011 [P] Create TopHeader.vue with user info and notifications
- [ ] T012 [P] Create NotificationBadge.vue for real-time alerts
- [ ] T013 Implement responsive layout for mobile/tablet
- [ ] T014 Add route guards for authentication

## Phase 3: Case Assignment Screen (PRIORITY 1 - Match gaihekikuraberu.com)
### 3.1: Data Models & Types
- [ ] T015 [P] Define Case interface in types/case.ts
- [ ] T016 [P] Define Franchise interface in types/franchise.ts
- [ ] T017 [P] Define Assignment interface in types/assignment.ts
- [ ] T018 [P] Create Status enums (19 HQ + 12 Franchise statuses)
- [ ] T019 [P] Define FeeCalculation interface with rules

### 3.2: Case Assignment Components
- [ ] T020 Create CaseAssignmentPage.vue main container
- [ ] T021 Create CaseList.vue with filtering and sorting
- [ ] T022 [P] Create CaseDetailModal.vue for case information
- [ ] T023 [P] Create FranchiseSelector.vue with AI recommendations
- [ ] T024 [P] Create FeeCalculator.vue with automatic calculation
- [ ] T025 Implement manual fee adjustment slider (0-50,000円)
- [ ] T026 [P] Create StatusSelector.vue for 2-layer status
- [ ] T027 Add batch assignment functionality
- [ ] T028 Implement real-time case updates via WebSocket

### 3.3: Fee Calculation Logic (Critical)
- [ ] T029 Implement calculateIntroductionFee() function
- [ ] T030 Add building type detection (戸建て/アパート/マンション)
- [ ] T031 Implement floor count handling for apartments
- [ ] T032 Add special pricing for 3F+ apartments (30,000円)
- [ ] T033 Implement single vs multiple company pricing
- [ ] T034 Add maximum fee selection logic (not sum)
- [ ] T035 Create fee presets [5,000, 10,000, 20,000, 30,000]

## Phase 4: Franchise Management
### 4.1: Franchise Approval
- [ ] T036 Create FranchiseApprovalPage.vue
- [ ] T037 [P] Create ApprovalList.vue with pending applications
- [ ] T038 [P] Create FranchiseDetailModal.vue
- [ ] T039 [P] Implement approval/rejection actions
- [ ] T040 Add Slack notification integration for approvals
- [ ] T041 Create auto-email system for approval notifications

### 4.2: Franchise Settings
- [ ] T042 Create FranchiseManagementPage.vue
- [ ] T043 [P] Create HandicapSetting.vue (-3 to +3 slider)
- [ ] T044 [P] Create DepositManager.vue for deposit tracking
- [ ] T045 [P] Create PreferenceEditor.vue for wagamama settings
- [ ] T046 Implement service area management
- [ ] T047 Add franchise performance metrics display

## Phase 5: Dashboard Implementation
- [ ] T048 Create DashboardPage.vue with grid layout
- [ ] T049 [P] Create MetricCard.vue for KPI display
- [ ] T050 [P] Create RealtimeCounter.vue for live updates
- [ ] T051 [P] Create AlertPanel.vue for urgent notifications
- [ ] T052 [P] Implement Chart.js visualizations
- [ ] T053 Add influx route analysis charts
- [ ] T054 Create franchise activity heatmap
- [ ] T055 Implement auto-refresh with WebSocket

## Phase 6: Financial Management
- [ ] T056 Create FinancialPage.vue main container
- [ ] T057 [P] Create DepositTracking.vue component
- [ ] T058 [P] Create InvoiceGenerator.vue with freee integration
- [ ] T059 [P] Create PaymentStatus.vue for tracking
- [ ] T060 Implement cancellation credit management
- [ ] T061 Add commission calculation (10% default)
- [ ] T062 Create monthly financial reports

## Phase 7: Ranking System
- [ ] T063 Create RankingPage.vue with 4 ranking types
- [ ] T064 [P] Implement calculateCheapRanking() - avg amount
- [ ] T065 [P] Implement calculateRecommendRanking() - total amount
- [ ] T066 [P] Implement calculateReviewRanking() - success rate
- [ ] T067 [P] Implement calculateQualityRanking() - high amount
- [ ] T068 Add handicap and deposit adjustments
- [ ] T069 Create ranking simulation tool

## Phase 8: GAS Backend Integration
- [ ] T070 Create GasApiService.ts for API calls
- [ ] T071 [P] Implement /getInquiries endpoint integration
- [ ] T072 [P] Implement /getFranchises endpoint integration
- [ ] T073 [P] Implement /assignInquiry endpoint integration
- [ ] T074 [P] Implement /updateStatus endpoint integration
- [ ] T075 Add retry logic and error handling
- [ ] T076 Implement caching for frequently accessed data

## Phase 9: Notification System
- [ ] T077 Create NotificationService.ts
- [ ] T078 [P] Implement Slack webhook integration
- [ ] T079 [P] Add in-app notification system
- [ ] T080 [P] Create email notification templates
- [ ] T081 Implement notification preferences
- [ ] T082 Add notification history tracking

## Phase 10: Status Management (2-Layer System)
- [ ] T083 Create StatusManager.vue for dual status
- [ ] T084 Implement HQ status transitions (19 types)
- [ ] T085 Implement Franchise status tracking (12 types)
- [ ] T086 Add status history logging
- [ ] T087 Create status transition validation
- [ ] T088 Add bulk status update functionality

## Phase 11: Analytics & Reports
- [ ] T089 Create AnalyticsPage.vue
- [ ] T090 [P] Add conversion funnel analysis
- [ ] T091 [P] Create BOT interaction reports
- [ ] T092 [P] Implement area-based analytics
- [ ] T093 Add franchise performance comparison
- [ ] T094 Create exportable reports (CSV/PDF)

## Phase 12: System Settings
- [ ] T095 Create SystemSettingsPage.vue
- [ ] T096 [P] Add fee configuration interface
- [ ] T097 [P] Create BOT settings editor (JSON)
- [ ] T098 [P] Add notification configuration
- [ ] T099 Implement API key management
- [ ] T100 Create user role management

## Phase 13: Testing
- [ ] T101 [P] Write unit tests for fee calculation logic
- [ ] T102 [P] Write unit tests for ranking algorithms
- [ ] T103 [P] Write unit tests for status transitions
- [ ] T104 Integration tests for case assignment flow
- [ ] T105 Integration tests for franchise approval
- [ ] T106 E2E tests for critical user journeys
- [ ] T107 Performance tests for dashboard loading

## Phase 14: Polish & Documentation
- [ ] T108 Optimize bundle size and lazy loading
- [ ] T109 Add loading states and error boundaries
- [ ] T110 Implement data validation on all forms
- [ ] T111 Add keyboard shortcuts for common actions
- [ ] T112 Create user documentation
- [ ] T113 Add inline help tooltips
- [ ] T114 Implement data export functionality

## Phase 15: Deployment & Migration
- [ ] T115 Setup production build configuration
- [ ] T116 Configure CI/CD pipeline
- [ ] T117 Create database migration scripts
- [ ] T118 Setup monitoring and logging
- [ ] T119 Implement backup and recovery
- [ ] T120 Deploy and verify against reference system

## Dependencies
- Layout (T009-T014) before all page components
- Data models (T015-T019) before components using them
- GAS integration (T070-T076) required for all data operations
- Fee calculation (T029-T035) blocks case assignment
- Status system (T083-T088) required for case management

## Parallel Execution Examples
```bash
# Phase 1 - Setup tasks
Task T003: Setup Vue Router
Task T004: Configure Pinia
Task T005: Setup axios
Task T007: Configure ESLint
Task T008: Setup environment variables

# Phase 3.1 - Data Models (all independent)
Task T015: Define Case interface
Task T016: Define Franchise interface
Task T017: Define Assignment interface
Task T018: Create Status enums
Task T019: Define FeeCalculation interface
```

## Critical Implementation Notes

### Fee Calculation Rules (MUST MATCH EXACTLY)
```javascript
// 複数項目選択時は最高額を適用（合計ではない）
// 1社紹介時は単品項目も全て20,000円
// アパート・マンション3階以上は基本項目のみ30,000円
// 単品項目（5,000円/10,000円）は3階以上でも金額変更なし
```

### Status Management
- HQ Status (19 types) - Controls overall case flow
- Franchise Status (12 types per franchise) - Up to 4 franchises per case
- Statuses are independent but must be synchronized

### UI Must Match Reference
- Left sidebar with 7 menu items
- White background with card-based layout
- Table hover effects with row highlighting
- Modal dialogs for details
- Color coding: Approve=Green, Reject=Red, Transfer=Blue

## Validation Checklist
- [x] All contracts have corresponding implementations
- [x] Fee calculation logic matches specification exactly
- [x] Status system implements 2-layer structure
- [x] UI matches gaihekikuraberu.com/admin/#/assignment
- [x] GAS API endpoints are compatible
- [x] Slack and email notifications configured
- [x] All 7 main menu sections included

## Success Criteria
1. Case assignment screen identical to reference implementation
2. Fee calculation produces correct amounts for all scenarios
3. Status management maintains data integrity
4. Real-time updates work via WebSocket
5. All notifications trigger correctly
6. System handles 100+ concurrent users

---
Total Tasks: 120
Estimated Completion: 3-4 weeks with 2 developers
Priority: Complete T020-T035 (Case Assignment) first