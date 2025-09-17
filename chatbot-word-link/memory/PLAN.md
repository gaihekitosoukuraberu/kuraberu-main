# Word-Link Chatbot Implementation Plan

## Architecture Overview

### System Components
```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   HTML5     │  │   CSS3       │  │  JavaScript  │  │
│  │  Structure  │  │   Styles     │  │  (Vanilla)   │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
│         │                │                   │          │
│         └────────────────┼───────────────────┘          │
│                          ▼                              │
│               ┌─────────────────────┐                   │
│               │  Chat Controller    │                   │
│               └─────────────────────┘                   │
│                          │                              │
│      ┌───────────────────┼───────────────────┐          │
│      ▼                   ▼                   ▼          │
│ ┌──────────┐   ┌──────────────┐   ┌──────────────┐    │
│ │  URL     │   │   Scenario    │   │    State     │    │
│ │ Parser   │   │    Manager    │   │   Manager    │    │
│ └──────────┘   └──────────────┘   └──────────────┘    │
│                          │                              │
│                          ▼                              │
│               ┌─────────────────────┐                   │
│               │   External APIs     │                   │
│               │  (Postal Code)      │                   │
│               └─────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

## Technical Stack

### Frontend Technologies
- **HTML5**: Semantic structure, data attributes
- **CSS3**: Animations, transitions, responsive design
- **JavaScript ES6+**: Modules, async/await, arrow functions
- **No Dependencies**: Pure Vanilla JS implementation

### Data Sources
- **bot-scenarios.json**: Conversation flow definitions
- **localStorage**: Session persistence
- **Postal API**: Address lookup service

## Implementation Modules

### 1. Core Modules

#### ChatbotCore.js
```javascript
class ChatbotCore {
  constructor(config) {
    this.config = config;
    this.state = new StateManager();
    this.scenario = new ScenarioManager();
    this.ui = new UIManager();
  }
  
  async initialize() {
    const word = URLParser.getWordParameter();
    await this.scenario.loadScenarios();
    const scenario = this.scenario.getScenario(word);
    this.startConversation(scenario);
  }
}
```

#### URLParser.js
```javascript
class URLParser {
  static getWordParameter() {
    const params = new URLSearchParams(window.location.search);
    const word = params.get('word');
    return word ? decodeURIComponent(word) : null;
  }
  
  static validateWord(word, validWords) {
    return validWords.includes(word);
  }
}
```

#### ScenarioManager.js
```javascript
class ScenarioManager {
  constructor() {
    this.scenarios = {};
    this.defaultScenario = null;
  }
  
  async loadScenarios() {
    const response = await fetch('/bot-scenarios.json');
    this.scenarios = await response.json();
    this.defaultScenario = this.scenarios.default;
  }
  
  getScenario(word) {
    return this.scenarios[word] || this.defaultScenario;
  }
}
```

#### StateManager.js
```javascript
class StateManager {
  constructor() {
    this.state = this.loadState() || this.getInitialState();
  }
  
  getInitialState() {
    return {
      currentWord: null,
      scenario: null,
      conversationHistory: [],
      currentQuestionIndex: 0,
      userResponses: {},
      stage: 'greeting'
    };
  }
  
  saveState() {
    localStorage.setItem('chatbot-state', JSON.stringify(this.state));
  }
  
  loadState() {
    const saved = localStorage.getItem('chatbot-state');
    return saved ? JSON.parse(saved) : null;
  }
}
```

### 2. UI Components

#### UIManager.js
```javascript
class UIManager {
  constructor(container) {
    this.container = container;
    this.messageArea = null;
    this.inputArea = null;
  }
  
  renderMessage(text, sender = 'bot') {
    const message = this.createMessageElement(text, sender);
    this.animateMessage(message);
    this.scrollToBottom();
  }
  
  showTypingIndicator() {
    const indicator = this.createTypingIndicator();
    this.messageArea.appendChild(indicator);
    return indicator;
  }
  
  async typeMessage(text, element) {
    for (let i = 0; i < text.length; i++) {
      element.textContent += text[i];
      await this.delay(50);
    }
  }
}
```

#### PostalInput.js
```javascript
class PostalInput {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.apiUrl = 'https://zipcloud.ibsnet.co.jp/api/search';
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'postal-input-container';
    container.innerHTML = this.getTemplate();
    this.attachEventListeners(container);
    return container;
  }
  
  async fetchAddress(zipcode) {
    const response = await fetch(`${this.apiUrl}?zipcode=${zipcode}`);
    const data = await response.json();
    return data.results?.[0] || null;
  }
  
  validate(zipcode) {
    return /^\d{3}-?\d{4}$/.test(zipcode);
  }
}
```

### 3. Animation & Effects

#### AnimationManager.js
```javascript
class AnimationManager {
  static fadeInUp(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';
    
    requestAnimationFrame(() => {
      element.style.transition = 'all 300ms ease';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }
  
  static typingDots() {
    return `
      <span class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
    `;
  }
}
```

### 4. API Integration

#### APIClient.js
```javascript
class APIClient {
  constructor() {
    this.timeout = 2000;
  }
  
  async request(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
}
```

## CSS Architecture

### Style Organization
```css
/* Base Styles */
:root {
  --primary-blue: #2563eb;
  --primary-hover: #1d4ed8;
  --chat-bg: #f3f4f6;
  --user-msg: #3b82f6;
  --bot-msg: #ffffff;
  --text-primary: #111827;
  --text-secondary: #6b7280;
}

/* Component Styles */
.chatbot-container { /* Container styles */ }
.message-area { /* Message display area */ }
.message { /* Individual message */ }
.message--bot { /* Bot message variant */ }
.message--user { /* User message variant */ }
.typing-indicator { /* Typing animation */ }
.postal-input { /* Postal code input */ }

/* Animations */
@keyframes fadeInUp { /* Fade in with slide */ }
@keyframes typing { /* Typing dots */ }

/* Responsive */
@media (max-width: 768px) { /* Mobile styles */ }
```

## Security Implementation

### Input Sanitization
```javascript
class SecurityUtils {
  static sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }
  
  static validateInput(input, pattern) {
    return pattern.test(input);
  }
  
  static generateCSRFToken() {
    return Math.random().toString(36).substr(2);
  }
}
```

### XSS Prevention
- All user inputs sanitized before display
- No innerHTML usage with user data
- Content Security Policy headers

### API Security
- CSRF tokens for all requests
- Request timeout enforcement
- HTTPS-only deployment

## Error Handling

### Error Types
```javascript
class ChatbotError extends Error {
  constructor(message, type) {
    super(message);
    this.type = type;
  }
}

class NetworkError extends ChatbotError {
  constructor(message) {
    super(message, 'NETWORK');
  }
}

class ValidationError extends ChatbotError {
  constructor(message) {
    super(message, 'VALIDATION');
  }
}
```

### Error Recovery
```javascript
class ErrorHandler {
  static handle(error) {
    switch(error.type) {
      case 'NETWORK':
        return this.handleNetworkError(error);
      case 'VALIDATION':
        return this.handleValidationError(error);
      default:
        return this.handleGenericError(error);
    }
  }
  
  static handleNetworkError(error) {
    // Show retry option
    // Fall back to manual input
  }
}
```

## Testing Strategy

### Unit Tests
```javascript
// URLParser.test.js
describe('URLParser', () => {
  test('should extract word parameter', () => {
    // Test implementation
  });
  
  test('should handle missing parameter', () => {
    // Test implementation
  });
});
```

### Integration Tests
- Scenario loading and selection
- Postal API integration
- State persistence
- UI updates

### E2E Tests
- Complete conversation flows
- All 44 word scenarios
- Error recovery paths
- Mobile interactions

## Performance Optimization

### Loading Strategy
1. Inline critical CSS
2. Async load non-critical resources
3. Preload bot-scenarios.json
4. Lazy load postal API module

### Runtime Optimization
1. Debounce user input
2. Throttle API calls
3. Virtual scrolling for long conversations
4. RequestAnimationFrame for animations

### Caching Strategy
1. Cache scenarios in memory
2. localStorage for state
3. Service Worker for offline support (future)

## Deployment Plan

### Build Process
```bash
# No build step needed (Vanilla JS)
# Copy files to deployment directory
cp chatbot-word-link.html /deploy/
cp chatbot-word-link.css /deploy/
cp chatbot-word-link.js /deploy/
```

### Environment Configuration
```javascript
const CONFIG = {
  development: {
    apiUrl: 'http://localhost:3000',
    debug: true
  },
  production: {
    apiUrl: 'https://api.example.com',
    debug: false
  }
};
```

### Deployment Checklist
- [ ] Minify CSS and JavaScript
- [ ] Enable GZIP compression
- [ ] Set security headers
- [ ] Configure HTTPS
- [ ] Test all scenarios
- [ ] Monitor performance

## File Structure

```
/Users/ryuryu/
├── chatbot-word-link.html
├── css/
│   └── chatbot-word-link.css
├── js/
│   ├── chatbot-word-link.js
│   ├── modules/
│   │   ├── ChatbotCore.js
│   │   ├── URLParser.js
│   │   ├── ScenarioManager.js
│   │   ├── StateManager.js
│   │   ├── UIManager.js
│   │   ├── PostalInput.js
│   │   ├── AnimationManager.js
│   │   ├── APIClient.js
│   │   ├── SecurityUtils.js
│   │   └── ErrorHandler.js
│   └── config/
│       └── config.js
└── data/
    └── bot-scenarios.json (existing)
```

## Implementation Phases

### Phase 1: Foundation (4 hours)
- [ ] HTML structure
- [ ] CSS styles (copy from existing)
- [ ] Core JavaScript modules
- [ ] URL parameter processing

### Phase 2: Chat Functionality (4 hours)
- [ ] Scenario loading
- [ ] Message rendering
- [ ] Typing animation
- [ ] User interaction

### Phase 3: Integration (4 hours)
- [ ] Postal code input
- [ ] API integration
- [ ] State management
- [ ] Error handling

### Phase 4: Polish & Testing (4 hours)
- [ ] Cross-browser testing
- [ ] Mobile optimization
- [ ] Performance tuning
- [ ] Final QA

## Success Validation

### Acceptance Criteria
1. All 44 word scenarios load correctly
2. Design matches existing system exactly
3. Postal input works for all timing options
4. State persists across refreshes
5. Errors handled gracefully
6. Performance meets requirements

### Sign-off Requirements
- [ ] Functional testing complete
- [ ] Visual regression testing passed
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation complete