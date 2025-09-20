# Biatec Algorand Scan Web Application

Biatec Algorand Scan is a Vue 3 + TypeScript + Vite frontend application that provides a professional Algorand blockchain explorer with real-time blocks, transactions, and AMM trades. The application connects to backend services via REST APIs and SignalR for live updates.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap, Build, and Test
- **Install dependencies**: `npm install` -- takes 2-3 minutes, expect deprecation warnings but installation succeeds
- **Build the application**: `npm run build` -- takes 23 seconds. NEVER CANCEL. Set timeout to 60+ minutes for safety. Produces warnings about large chunks and SignalR comments but build succeeds
- **Type checking**: Included in build process via `vue-tsc -b`
- **Linting**: `npx eslint src/` -- currently shows 28 errors and 5 warnings (existing issues not related to new changes)

### Development and Testing
- **Start development server**: `npm run dev` -- starts instantly on http://localhost:5173/
- **Preview production build**: `npm run preview` -- serves dist/ on http://localhost:4173/
- **Generate API client**: `npm run generate:api` -- fails due to network restrictions (external OpenAPI spec), but generated files already exist in src/api/

### Manual Validation Requirements
- ALWAYS manually test the application after making changes by visiting http://localhost:5173/
- **CRITICAL**: The application should load and display the Algorand explorer dashboard with navigation working
- **Expected behavior**: 
  - Dashboard shows loading states for blockchain data
  - Connection status shows "OFFLINE" (expected due to external API restrictions)
  - Navigation between pages (Explore, Search, Assets, About) works
  - Search functionality is present in the top navigation
- **Validation scenarios**: Navigate to different views like /assets, /search, /about and verify they load properly
- Take screenshots when making UI changes to verify visual impact

## Project Structure and Key Locations

### Source Code Organization
```
src/
├── api/                 # Generated API client (Orval from OpenAPI)
│   ├── index.ts        # Main API exports
│   ├── models/         # TypeScript interfaces
│   └── axios-instance.ts # HTTP client configuration
├── components/         # Vue components
│   └── Navbar.vue     # Main navigation
├── services/          # Business logic services
│   ├── algorandService.ts  # Algorand blockchain integration
│   ├── signalrService.ts   # Real-time updates
│   ├── assetService.ts     # Asset management
│   └── authService.ts      # Authentication
├── views/             # Page components
│   ├── Dashboard.vue      # Main dashboard
│   ├── Assets.vue         # Asset listings
│   ├── Search.vue         # Search interface
│   ├── BlockDetails.vue   # Block information
│   ├── TransactionDetails.vue # Transaction details
│   └── PoolDetails.vue    # AMM pool information
├── router/            # Vue Router configuration
├── types/             # TypeScript type definitions
└── main.ts           # Application entry point
```

### Configuration Files
- `package.json` - Dependencies and npm scripts
- `vite.config.ts` - Vite build configuration
- `eslint.config.ts` - ESLint linting rules
- `tailwind.config.ts` - Tailwind CSS configuration
- `orval.config.ts` - API client generation from OpenAPI spec
- `tsconfig.json` - TypeScript configuration

### Deployment and Infrastructure
- `docker/Dockerfile` - Production Docker image with nginx
- `docker/compose.sh` - Docker build and push script
- `k8s/` - Kubernetes deployment manifests
- `.github/workflows/build-fe.yml` - CI/CD pipeline

## Build and Deployment

### Local Development
- **NEVER CANCEL builds or long-running commands**
- Use timeouts of 60+ minutes for build commands and 30+ minutes for any network operations
- The build process includes TypeScript compilation and Vite bundling
- Development server includes hot module replacement (HMR)

### Production Build
- Build outputs to `dist/` directory
- Uses nginx in Docker container for serving static files
- Kubernetes deployment available for production environments

### API Integration
- Generated TypeScript client connects to `https://algorand-trades.de-4.biatec.io`
- Uses Orval for type-safe API client generation from OpenAPI spec
- SignalR for real-time blockchain updates via `/biatecScanHub`
- **NOTE**: API generation fails in restricted environments but generated code already exists

## Known Issues and Limitations

### ESLint Issues (Existing - Not Related to New Changes)
- 28 errors and 5 warnings exist in the codebase
- Common issues: `@typescript-eslint/no-explicit-any`, `vue/multi-word-component-names`
- These are existing issues - only fix if directly related to your changes
- Run `npx eslint src/` to see current issues

### Network Dependencies
- `npm run generate:api` requires external network access to OpenAPI spec
- In restricted environments, this command fails but generated files already exist
- The application gracefully handles offline/restricted network scenarios

### Build Warnings (Expected)
- Large chunk size warnings (>500KB) are expected due to dependencies
- SignalR comment parsing warnings during build are harmless
- These warnings do not affect application functionality

## Common Development Tasks

### Making Changes to UI Components
1. Edit Vue components in `src/components/` or `src/views/`
2. Run `npm run dev` to start development server
3. Test changes at http://localhost:5173/
4. Run `npm run build` to ensure production build succeeds
5. Run `npx eslint src/` only if making substantial changes to check for new linting issues

### Working with API Integration
- API models are in `src/api/models/`
- Services that consume APIs are in `src/services/`
- If API spec changes, run `npm run generate:api` (if network allows) or manually update types
- **Always check that API integration still works after changes**

### Styling and UI Changes
- Uses Tailwind CSS for styling
- Global styles in `src/style.css`
- Component-specific styles in individual Vue files
- Always test responsive design on different screen sizes

### Adding New Features
- Follow Vue 3 Composition API patterns used throughout the codebase
- Add new routes in `src/router/index.ts`
- Create services for business logic, keep components focused on presentation
- Use TypeScript strictly - avoid `any` types

## Validation Checklist
Before considering any changes complete:
- [ ] `npm install` completes successfully
- [ ] `npm run build` completes successfully (23 seconds expected)
- [ ] `npm run dev` starts successfully and application loads
- [ ] Navigate through main sections (Dashboard, Assets, Search, About)
- [ ] Verify no new ESLint errors introduced (ignore existing ones)
- [ ] Take screenshot if UI changes made
- [ ] Test responsive design if layout changes made

## Troubleshooting
- **Build fails**: Check TypeScript errors, ensure all imports are valid
- **Dev server won't start**: Check for port conflicts, ensure dependencies installed
- **API generation fails**: Expected in restricted environments, use existing generated files
- **SignalR connection fails**: Expected behavior when backend is not accessible
- **Linting errors**: Only address new errors introduced by your changes