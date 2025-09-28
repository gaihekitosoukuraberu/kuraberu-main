# Word-Link Chatbot Product Requirements Document

## Executive Summary

A word-link based chatbot system that provides customized conversation flows for exterior renovation estimates. The system detects keywords from URL parameters and adjusts the conversation accordingly, while maintaining exact compatibility with the existing estimate-keep-system design.

## Problem Statement

Currently, users arriving from different landing pages (LPs) with specific renovation needs see a generic chatbot greeting. This misses the opportunity to provide personalized, context-aware conversations that directly address their specific needs (e.g., roof painting, waterproofing, siding).

## Goals & Success Criteria

### Primary Goals
1. **Personalized Entry**: Users clicking from specialized LPs see relevant greetings and questions
2. **Seamless Integration**: Postal code collection happens naturally within conversation flow
3. **Design Consistency**: Exact match with existing chatbot UI/UX
4. **Conversion Optimization**: Guide users through CV1 → Ranking → CV2 flow

### Success Metrics
- 100% accurate word parameter detection
- < 1 second page load time
- Zero design discrepancies from existing system
- All 44 keyword scenarios functioning correctly

## User Stories

### Story 1: LP Visitor with Specific Need
**As a** user clicking from a roof painting LP  
**I want to** see a chatbot that immediately understands I need roof painting  
**So that** I don't have to explain my needs from scratch

### Story 2: Direct URL Access
**As a** user accessing the chatbot directly without parameters  
**I want to** see a general greeting that helps identify my needs  
**So that** I can still get appropriate assistance

### Story 3: Mobile User
**As a** mobile user  
**I want to** have the same smooth experience as desktop  
**So that** I can complete my estimate request on any device

## Functional Requirements

### 1. URL Parameter Processing
- System MUST detect `word` parameter from URL
- System MUST decode UTF-8 encoded Japanese text
- System MUST map word to appropriate scenario
- System MUST fall back to default for unknown/missing words

### 2. Scenario Management
- System MUST load scenarios from bot-scenarios.json
- System MUST support 44 predefined keywords
- Each scenario MUST include: greeting, postalTiming, questions, initialContext
- System MUST NOT hardcode scenarios in JavaScript

### 3. Conversation Flow

#### Initial Greeting
- Display scenario-specific greeting message
- Use typing animation (50ms per character)
- Show user avatar and bot avatar

#### Question Progression
- Display questions based on scenario configuration
- Support three postal timing options:
  - `immediate`: Show postal input after greeting
  - `after_q1`: Show after first question
  - `after_q2`: Show after second question

#### Postal Code Integration
- Display inline postal code input field
- Format: XXX-XXXX (with automatic hyphen)
- Real-time validation
- API call to fetch address on valid input
- Auto-populate prefecture and city fields
- Show error messages for invalid codes

### 4. State Management
- Persist conversation history
- Save user responses
- Maintain session across page refreshes
- Store in localStorage

### 5. Transitions
- CV1: Transition to estimate form after questions
- Ranking: Display ranking screen after CV1
- CV2: Final confirmation after ranking

## Non-Functional Requirements

### Performance
- Page load: < 1 second
- Typing animation: 50ms/character
- API response timeout: 2 seconds
- Smooth 60fps animations

### Compatibility
- Desktop: Chrome 90+, Safari 14+, Firefox 88+, Edge 90+
- Mobile: iOS Safari 14+, Chrome Android 8+
- Responsive design for all screen sizes

### Security
- XSS prevention on all user inputs
- CSRF tokens for API calls
- HTTPS-only deployment
- No sensitive data in localStorage

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus indicators

## Design Requirements

### Visual Design (Must Match Existing)
- Primary blue: #2563eb
- Chat background: #f3f4f6
- User message: #3b82f6
- Bot message: #ffffff
- Font: System font stack
- Border radius: 8px for bubbles
- Shadow: 0 1px 3px rgba(0,0,0,0.1)

### Animations
- Fade in with slide up for new messages
- Three-dot typing indicator
- Smooth transitions (300ms)
- Button hover effects

### Layout
- Maximum width: 800px
- Padding: 16px on mobile, 24px on desktop
- Message spacing: 12px between bubbles
- Responsive breakpoint: 768px

## Technical Architecture

### File Structure
```
/Users/ryuryu/
├── chatbot-word-link.html     # Main application
├── chatbot-word-link.css      # Styles (copy from existing)
├── chatbot-word-link.js       # Core logic
└── bot-scenarios.json         # Scenario definitions (existing)
```

### Data Flow
1. URL Parameter → Parse & Decode
2. Load Scenarios → Find Match
3. Initialize Chat → Display Greeting
4. User Interaction → Update State
5. API Calls → Update UI
6. State Persistence → localStorage

### API Integration
- Postal Code API: `https://zipcloud.ibsnet.co.jp/api/search`
- Method: GET
- Parameter: zipcode (7 digits)
- Response: JSON with address data

## Constraints & Assumptions

### Constraints
- Must use Vanilla JavaScript (no frameworks)
- Cannot modify existing postal form
- Must maintain exact design match
- Must support all 44 existing keywords

### Assumptions
- Users have modern browsers
- Network connection is stable
- Postal API remains available
- bot-scenarios.json format is stable

## Dependencies

### External
- Postal code API service
- Existing estimate-keep-system for reference
- bot-scenarios.json file

### Internal
- CV1 form page
- Ranking display page
- CV2 confirmation page

## Risks & Mitigation

### Risk 1: API Unavailability
**Mitigation**: Implement fallback to manual address entry

### Risk 2: Browser Incompatibility  
**Mitigation**: Progressive enhancement, graceful degradation

### Risk 3: Design Drift
**Mitigation**: Automated visual regression testing

## Timeline & Phases

### Phase 1: Core Implementation (Day 1)
- URL parameter processing
- Basic chat UI
- Scenario loading

### Phase 2: Integration (Day 1-2)
- Postal code input
- API integration
- State management

### Phase 3: Polish (Day 2)
- Animations
- Error handling
- Cross-browser testing

### Phase 4: Testing (Day 2-3)
- All 44 scenarios
- Mobile testing
- Performance optimization

## Appendix

### Supported Keywords (44 total)
外壁塗装, 屋根塗装, 防水工事, 雨漏り修理, 外壁リフォーム, 屋根リフォーム, サイディング, モルタル, ガルバリウム, コーキング, シーリング, ベランダ防水, 屋上防水, 外装工事, 塗装工事, リノベーション, メンテナンス, 修繕工事, 改修工事, 塗り替え, カラーベスト, スレート屋根, 瓦屋根, トタン屋根, 雨樋, 軒天, 破風板, 鼻隠し, 笠木, 基礎塗装, タイル, レンガ, ALC, RC, 木部塗装, 鉄部塗装, 付帯部, エクステリア, 断熱塗装, 遮熱塗装, 光触媒, フッ素塗装, シリコン塗装, 無機塗装