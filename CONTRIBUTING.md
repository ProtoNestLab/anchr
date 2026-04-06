# Contributing to Anchor SDK

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/ProtoNestLab/anchr.git
cd anchr

# Install dependencies
pnpm install

# Start the demo app
pnpm dev
```

## Project Structure

```
packages/
  core/     # Types, client, adapters, plugins (no Vue dependency)
  vue/      # Vue 3 components and composables
  ui/       # Pre-built UI components
apps/
  demo/     # Demo application
docs/       # VitePress documentation
```

## Commands

| Command           | Description             |
| ----------------- | ----------------------- |
| `pnpm dev`        | Start demo app          |
| `pnpm build`      | Build all packages      |
| `pnpm test`       | Run tests               |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint`       | Lint all files          |
| `pnpm lint:fix`   | Lint and auto-fix       |
| `pnpm format`     | Format all files        |
| `pnpm typecheck`  | Type check all packages |
| `pnpm size`       | Check bundle sizes      |
| `pnpm docs:dev`   | Start docs dev server   |

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Add tests if applicable
4. Run `pnpm lint && pnpm test && pnpm build` to verify
5. Add a changeset: `pnpm changeset`
6. Open a pull request

## Changesets

We use [changesets](https://github.com/changesets/changesets) for versioning. When your PR includes user-facing changes, run:

```bash
pnpm changeset
```

Select the affected packages, the semver bump type, and write a summary. This generates a file in `.changeset/` — commit it with your PR.

## Code Style

- ESLint + Prettier are configured and enforced via pre-commit hooks
- Vue components use `<script setup lang="ts">` with Composition API
- CSS uses `var(--anchor-*)` custom properties for theming
- Prefix all CSS classes with `anchor-` to avoid conflicts

## Testing

Tests use [Vitest](https://vitest.dev/). Add tests in `__tests__/` directories next to the source files.

```bash
pnpm test           # Run once
pnpm test:watch     # Watch mode
```

## Bundle Size

Bundle size is tracked via [size-limit](https://github.com/ai/size-limit). Check sizes with:

```bash
pnpm size
```

If your changes increase bundle size significantly, justify it in the PR description.
