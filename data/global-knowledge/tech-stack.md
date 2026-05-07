# Tech Stack

All projects use this stack:
- React Native with TypeScript (strict mode)
- React Navigation for routing
- Zustand for state management
- React Query for server state
- Jest + React Testing Library for unit tests
- Detox for E2E tests
- Our subscription SDK (@agent-team/subscription-sdk)

## Code Standards
- Functional components only (no classes)
- Custom hooks for business logic
- No `any` types
- Every component gets a unit test
- Handle all states: loading, error, empty, success
