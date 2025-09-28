# Research Document: Admin Dashboard Implementation

## Vue.js 3 Architecture Decisions

### Decision: Composition API with TypeScript
**Rationale**: 
- Better TypeScript integration with improved type inference
- Cleaner separation of concerns in complex components
- Easier to share logic between components via composables

**Alternatives considered**:
- Options API: Simpler but less scalable for complex state management
- React: More ecosystem but Vue.js matches existing kuraberu system

### Component Structure
**Decision**: Single File Components (SFC) with `<script setup>`
**Rationale**: 
- Reduced boilerplate
- Better performance (compile-time optimizations)
- Cleaner component code

## Real-time Updates Architecture

### Decision: Socket.io for WebSocket communication
**Rationale**:
- Automatic fallback mechanisms
- Room-based broadcasting for efficient updates
- Reconnection handling built-in

**Alternatives considered**:
- Native WebSocket: More lightweight but requires more implementation
- Server-Sent Events: One-way only, not suitable for bidirectional

### Update Strategy
**Decision**: Selective real-time updates
- Dashboard metrics: 5-second polling + push on critical changes
- Case assignment: Immediate push to relevant franchises
- Status changes: Immediate broadcast to all connected clients

## AI Assignment System

### Decision: Weighted scoring algorithm
**Components**:
1. **Distance Score** (30%): Geographic proximity
2. **Capacity Score** (25%): Current workload
3. **Performance Score** (25%): Historical success rate
4. **Preference Score** (20%): Match with "wagamama" settings

**Rationale**: Balanced approach considering multiple factors

### Manual Override
**Decision**: AI suggestions with manual adjustment capability
- AI provides top 3 recommendations
- Staff can override with reason logging
- Override patterns feed back into AI training

## State Management

### Decision: Pinia for global state
**Rationale**:
- Official Vue.js state management
- Better TypeScript support than Vuex
- Simpler API with less boilerplate

**Store Structure**:
- `cases`: Active cases and their statuses
- `franchises`: Franchise data and preferences
- `user`: Authentication and permissions
- `ui`: Application UI state

## Data Visualization

### Decision: Chart.js with vue-chartjs wrapper
**Rationale**:
- Responsive and performant
- Good Vue.js integration
- Extensive chart types for dashboards

**Chart Types**:
- Line charts: Trend analysis
- Bar charts: Comparative metrics
- Doughnut: Status distribution
- Heatmap: Geographic case density

## Authentication & Security

### Decision: JWT with refresh tokens
**Rationale**:
- Stateless authentication
- Scalable across multiple servers
- Secure with proper implementation

**Security Measures**:
- HTTPS only
- CORS properly configured
- Rate limiting on API endpoints
- Input sanitization

## Database Design

### Decision: PostgreSQL with TypeORM
**Rationale**:
- ACID compliance for financial data
- JSON support for flexible schemas
- Strong typing with TypeORM

**Optimization**:
- Indexes on frequently queried fields
- Materialized views for complex rankings
- Connection pooling for performance

## Testing Strategy

### Unit Testing
**Tool**: Vitest
- Fast execution
- Native ESM support
- Jest-compatible API

### Integration Testing
**Tool**: Supertest + Vitest
- API endpoint testing
- Database integration verification

### E2E Testing
**Tool**: Playwright
- Cross-browser testing
- Visual regression testing
- User flow validation

## Performance Optimizations

### Frontend
- Lazy loading for routes
- Virtual scrolling for large lists
- Image optimization with WebP
- Code splitting by feature

### Backend
- Query optimization with proper indexes
- Caching strategy with Redis
- Batch processing for notifications
- Connection pooling

## Deployment Architecture

### Decision: Docker containers with orchestration
**Rationale**:
- Consistent environments
- Easy scaling
- Simplified deployment

**Infrastructure**:
- Frontend: Nginx serving static files
- Backend: Node.js cluster mode
- Database: Managed PostgreSQL
- Cache: Redis cluster

## Monitoring & Logging

### Decision: Structured logging with correlation IDs
**Tools**:
- Winston for backend logging
- Sentry for error tracking
- Custom frontend logger

**Metrics**:
- Response times
- Error rates
- User actions
- System health

## API Design Principles

### RESTful with consistent patterns
- Predictable URL structure
- Standard HTTP methods
- Consistent error responses
- Pagination for lists

### API Versioning
**Decision**: URL path versioning (/api/v1/)
**Rationale**: 
- Clear and explicit
- Easy to route
- Simple to deprecate

## Browser Compatibility

### Target Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Polyfills
- Minimal polyfills for modern features
- Progressive enhancement approach

## Accessibility

### WCAG 2.1 Level AA Compliance
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Screen reader support

## Internationalization

### Decision: vue-i18n for multi-language support
**Current Scope**: Japanese only
**Future Ready**: Structure supports easy addition of languages

---

All technical decisions have been researched and documented. No NEEDS CLARIFICATION items remain. Ready for Phase 1 implementation.