# Word-Link Chatbot Constitution

## Core Principles

### I. Exact Design Preservation (NON-NEGOTIABLE)
The chatbot UI/UX must be an exact match with the existing estimate-keep-system design. No design variations are permitted. All animations, colors, fonts, and interactions must be identical.

### II. URL Parameter-Driven
Every conversation flow starts from a URL parameter. The `word` parameter determines the initial scenario. Unknown or missing parameters fall back to the default scenario gracefully.

### III. Postal Code Integration
Postal code input is integrated within the bot conversation flow, not as a separate form. Timing varies by scenario (immediate, after_q1, after_q2). The existing standalone postal form must remain untouched.

### IV. Scenario-Based Architecture
All conversation flows are defined in bot-scenarios.json. No hardcoded scenarios in JavaScript. Changes to conversation flow require only JSON updates.

### V. Progressive Enhancement
Start with core functionality (word detection, basic chat). Add features incrementally (animations, API integration, persistence). Each enhancement must not break existing features.

## Technical Constraints

### Technology Stack
- Pure HTML5, CSS3, JavaScript (ES6+)
- No framework dependencies (Vanilla JS only)
- Existing postal API for address lookup
- JSON-based scenario configuration

### Browser Support
- Chrome 90+, Safari 14+, Firefox 88+, Edge 90+
- Mobile Safari (iOS 14+), Chrome Mobile (Android 8+)
- Graceful degradation for older browsers

### Performance Requirements
- Initial load < 1 second
- Message typing effect: 50ms/character
- API timeout: 2 seconds max
- Animation duration: 300ms

## Development Workflow

### Testing Requirements
- Manual testing for all 44 word scenarios
- Postal code validation testing
- Cross-browser compatibility testing
- Mobile responsiveness testing
- Error handling verification

### Security Standards
- XSS prevention on all inputs
- CSRF protection for API calls
- HTTPS-only deployment
- No sensitive data in localStorage

## Governance

The Constitution supersedes all implementation decisions. Any changes to core principles require documentation and migration plan. The existing system's design and flow are the ultimate source of truth.

**Version**: 1.0.0 | **Ratified**: 2025-09-11 | **Last Amended**: 2025-09-11