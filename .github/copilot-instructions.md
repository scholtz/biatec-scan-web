# Biatec Algorand Scan Web Application

Biatec Algorand Scan is a Vue 3 + TypeScript + Vite frontend application that provides a professional Algorand blockchain explorer with real-time blocks, transactions, and AMM trades. The application connects to backend services via REST APIs and SignalR for live updates.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap, Build, and Test

- **Install dependencies**: `pnpm install` -- takes 2-3 minutes, expect deprecation warnings but installation succeeds
- **Build the application**: `pnpm run build` -- takes 23 seconds. NEVER CANCEL. Set timeout to 60+ minutes for safety. Produces warnings about large chunks and SignalR comments but build succeeds
- **Type checking**: Included in build process via `vue-tsc -b`
- **Linting**: `pnpm run lint` -- should pass cleanly; fix any new errors introduced by your changes
- **E2E tests**: `pnpm exec playwright install --with-deps chromium` once, then `pnpm run test:e2e` -- builds the app, serves it via `vite preview`, and checks that every top-level page loads without console/page errors and that the language switcher (`e2e/i18n.spec.ts`) actually changes rendered text

### Development and Testing

- **Start development server**: `pnpm run dev` -- starts instantly on http://localhost:5173/
- **Preview production build**: `pnpm run preview` -- serves dist/ on http://localhost:4173/
- **Generate API client**: `pnpm run generate:api` -- fails due to network restrictions (external OpenAPI spec), but generated files already exist in src/api/

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

### Formatting Requirements

- **Currency Formatting**: ALWAYS format balances as decimal numbers localized to the user's language.
  - Example: `45700609 µAlgo` must be displayed as `45,700609 Algo` (depending on locale).
  - Make sure to convert payment amount or asset amount from base units to standard units according to asset decimals.
  - Use `Intl.NumberFormat` with the current i18n locale (e.g., `locale.value` from `useI18n()`) instead of hardcoded locales like "en-US".
  - Apply this rule to all asset and payment transaction details, including inner transactions.

## Project Structure and Key Locations

### Source Code Organization

```
src/
├── api/                 # Generated API client (Orval from OpenAPI)
│   ├── index.ts        # Main API exports
│   ├── models/         # TypeScript interfaces
│   └── axios-instance.ts # HTTP client configuration
├── components/         # Vue components
│   ├── Navbar.vue     # Main navigation
│   └── LanguageSwitcher.vue # Language switching component
├── i18n/               # Internationalization
│   ├── index.ts        # i18n configuration
│   └── locales/        # Translation files
│       ├── en.json     # English translations
│       └── sk.json     # Slovak translations
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

- `package.json` - Dependencies and pnpm scripts (this project uses **pnpm**, not npm/yarn)
- `playwright.config.ts` - Playwright E2E test configuration
- `e2e/` - Playwright E2E tests (page accessibility + i18n)
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

### Network Dependencies

- `pnpm run generate:api` requires external network access to OpenAPI spec
- In restricted environments, this command fails but generated files already exist
- The application gracefully handles offline/restricted network scenarios

### Build Warnings (Expected)

- Large chunk size warnings (>500KB) are expected due to dependencies
- SignalR comment parsing warnings during build are harmless
- These warnings do not affect application functionality

## Common Development Tasks

### Making Changes to UI Components

1. Edit Vue components in `src/components/` or `src/views/`
2. Run `pnpm run dev` to start development server
3. Test changes at http://localhost:5173/
4. Run `pnpm run build` to ensure production build succeeds
5. Run `pnpm run lint` only if making substantial changes to check for new linting issues

### Working with API Integration

- API models are in `src/api/models/`
- Services that consume APIs are in `src/services/`
- If API spec changes, run `pnpm run generate:api` (if network allows) or manually update types
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
- **ALWAYS use i18n for any new user-facing text** - see Internationalization section below

## Internationalization (i18n)

The application supports **8 languages** using Vue I18n with comprehensive multilingual support:

### Supported Languages

- **English (en)** 🇺🇸 - Default fallback language
- **Slovak (sk)** 🇸🇰 - Slovenčina
- **Chinese (zh)** 🇨🇳 - 中文 (Simplified Chinese)
- **German (de)** 🇩🇪 - Deutsch
- **Spanish (es)** 🇪🇸 - Español
- **Czech (cs)** 🇨🇿 - Čeština
- **Russian (ru)** 🇷🇺 - Русский
- **Polish (pl)** 🇵🇱 - Polski

### Language Files Location

- `src/i18n/locales/en.json` - English translations
- `src/i18n/locales/sk.json` - Slovak translations
- `src/i18n/locales/zh.json` - Chinese translations
- `src/i18n/locales/de.json` - German translations
- `src/i18n/locales/es.json` - Spanish translations
- `src/i18n/locales/cs.json` - Czech translations
- `src/i18n/locales/ru.json` - Russian translations
- `src/i18n/locales/pl.json` - Polish translations
- `src/i18n/index.ts` - i18n configuration with browser locale detection
- `public/flags/` - SVG flag icons for all supported countries

### Using Translations in Components

```vue
<template>
  <!-- Use $t() in templates -->
  <h1>{{ $t("common.loading") }}</h1>
  <button :title="$t('common.refresh')">{{ $t("common.refresh") }}</button>

  <!-- With interpolation for dynamic content -->
  <span>{{
    $t("common.copiedAssetId", { name: assetName, id: assetId })
  }}</span>

  <!-- For computed/reactive translations -->
  <p>{{ computedTitle }}</p>
</template>

<script setup>
// Use t() in script (requires import)
import { useI18n } from "vue-i18n";
import { computed } from "vue";

const { t } = useI18n();

// Simple translation
const message = t("common.loading");

// Computed translation for reactive updates
const computedTitle = computed(() => t("dashboard.title"));
</script>
```

### Language Switcher with Flags

- Available in Settings page at `/settings`
- Shows flag icons for visual language identification
- Persists selection to localStorage
- **Browser locale detection**: Automatically detects user's browser language on first visit
- **Smart fallback**: Saved preference → browser language → English
- Dynamic switching without page reload
- **Z-index properly configured** for dropdown display

### Translation Key Structure

- `common.*` - Shared UI elements (buttons, labels, loading states, etc.)
- `nav.*` - Navigation menu items
- `dashboard.*` - Dashboard page content
- `assets.*` - Assets page content
- `search.*` - Search page content
- `favorites.*` - Favorites page content
- `settings.*` - Settings page content including language selection
- `about.*` - About page content
- `status.*` - Status messages (online/offline)

### Professional Translation Guidelines

1. **Add keys to ALL language files**: English, Slovak, Chinese, German, Spanish, Czech, Russian, Polish
2. **Use descriptive nested keys**: `section.element` or `page.section.element`
3. **Support interpolation**: Use named parameters `{variableName}` for dynamic content
4. **Maintain technical accuracy**: Use proper blockchain/DeFi terminology for each language
5. **Cultural adaptation**: Consider cultural context and appropriate phrasing
6. **Test thoroughly**: Verify language switching works across all supported languages
7. **Character encoding**: Ensure proper display of Chinese characters, Cyrillic, umlauts, accents

### Adding New Translations

1. Add key to **all 8 language files**: `en.json`, `sk.json`, `zh.json`, `de.json`, `es.json`, `cs.json`, `ru.json`, `pl.json`
2. Provide professional translations appropriate for technical/blockchain context
3. Test with language switcher to ensure proper display
4. Use computed properties for reactive translation updates when needed
5. Verify text length doesn't break responsive design in any language

### Translation Examples

```json
{
  "common": {
    "loading": "Loading...",
    "refresh": "Refresh",
    "copyAssetId": "Copy {name} asset ID: {id}",
    "copiedAssetId": "Copied {name} asset ID: {id}",
    "sold": "Sold",
    "bought": "Bought",
    "liquidityProvider": "Liquidity Provider"
  },
  "dashboard": {
    "title": "Dashboard",
    "latestBlocks": "Latest Blocks",
    "liveAmmTrades": "Live AMM Trades"
  }
}
```

### Z-Index and UI Considerations

- **Language switcher dropdown**: Uses `z-[9999]` for proper layering
- **Parent containers**: Include `relative z-10` when needed for stacking context
- **Responsive design**: All languages tested for proper text wrapping and layout
- **Flag integration**: SVG flags optimized for performance and accessibility

**CRITICAL**: Never hardcode user-facing text in components. Always use translation keys with $t() function calls. All new user-facing text must be translated into all 8 supported languages.

## Validation Checklist

Before considering any changes complete:

- [ ] `pnpm install` completes successfully
- [ ] `pnpm run build` completes successfully (23 seconds expected)
- [ ] `pnpm run dev` starts successfully and application loads
- [ ] Navigate through main sections (Dashboard, Assets, Search, About)
- [ ] Verify no new ESLint errors introduced (ignore existing ones)
- [ ] `pnpm run test:e2e` passes
- [ ] Take screenshot if UI changes made
- [ ] Test responsive design if layout changes made

## Troubleshooting

- **Build fails**: Check TypeScript errors, ensure all imports are valid
- **Dev server won't start**: Check for port conflicts, ensure dependencies installed
- **API generation fails**: Expected in restricted environments, use existing generated files
- **SignalR connection fails**: Expected behavior when backend is not accessible
- **Linting errors**: Only address new errors introduced by your changes
