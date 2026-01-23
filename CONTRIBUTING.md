# Contributing to @breakingthelines/viz

First off, thank you for considering contributing to BTL Viz! This project aims to democratise football data visualisation, and we welcome contributions from developers, designers, and football analytics enthusiasts.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Contribution Paths](#contribution-paths)
- [Development Workflow](#development-workflow)
- [Component Guidelines](#component-guidelines)
- [Stability Model](#stability-model)
- [Security Rules](#security-rules)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming, inclusive environment. Please be respectful in all interactions.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- Node.js >= 18
- Git

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/breakingthelines/viz.git
cd viz

# Install dependencies
bun install

# Start Storybook for development
bun run dev
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Storybook on port 6008 |
| `bun run build` | Build the package |
| `bun run lint` | Run oxlint |
| `bun run format` | Format code with oxfmt |
| `bun run test` | Run tests |

## Contribution Paths

We welcome different types of contributions:

| Contributor Type | Entry Points |
|------------------|--------------|
| **Non-developer** | Figma mockups, documentation improvements, bug reports |
| **Junior developer** | Issues labeled `good-first-issue`, Storybook examples, tests |
| **Experienced developer** | New components, primitives, performance improvements |
| **Analytics/Data person** | Viz ideas with mockups, data validation, test fixtures |

### Finding Issues

- Look for issues labeled [`good-first-issue`](https://github.com/breakingthelines/viz/labels/good-first-issue)
- Check [`help-wanted`](https://github.com/breakingthelines/viz/labels/help-wanted) for more complex tasks
- Browse the [roadmap](https://github.com/breakingthelines/viz/projects) for planned features

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-new-component
# or
git checkout -b fix/shot-map-sizing
```

### 2. Make Your Changes

- Write your code
- Add/update tests
- Add/update Storybook stories
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run linting
bun run lint

# Check formatting
bun run format:check

# Run tests
bun run test

# Check TypeScript
bun run check

# Build to ensure it compiles
bun run build
```

### 4. Commit Your Changes

We use conventional commits:

```bash
git commit -m "feat(shot-map): add heatmap overlay option"
git commit -m "fix(pitch): correct penalty arc radius"
git commit -m "docs: update README with new examples"
```

**Prefixes:**
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `style:` — Formatting, no code change
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

## Component Guidelines

### Required for All Components

1. **TypeScript** — All components must be fully typed (no `any`)
2. **Stories** — Every component needs a `.stories.tsx` file
3. **Accessibility** — Keyboard navigation, ARIA labels, screen reader support
4. **Documentation** — JSDoc comments on props and exports

### Component Structure

```
src/football/primitives/
├── my-component.tsx          # Component implementation
├── my-component.stories.tsx  # Storybook stories
└── index.ts                  # Re-export (update this)
```

### Example Component Template

```tsx
import { cn } from '#/lib/utils';

export interface MyComponentProps {
  /** Description of the prop */
  variant?: 'default' | 'alternate';
  /** Additional CSS classes */
  className?: string;
  /** Child elements */
  children?: React.ReactNode;
}

/**
 * Brief description of what this component does.
 *
 * @example
 * <MyComponent variant="default">
 *   Content here
 * </MyComponent>
 */
export function MyComponent({
  variant = 'default',
  className,
  children,
}: MyComponentProps) {
  return (
    <div className={cn('base-styles', className)}>
      {children}
    </div>
  );
}
```

### Example Story Template

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MyComponent } from './my-component';

const meta = {
  title: 'Football/Primitives/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
};

export const Alternate: Story = {
  args: {
    variant: 'alternate',
  },
};
```

## Stability Model

Components follow a promotion path:

```
experimental/ → compositions/
    ↑              ↑
  (new)        (stable)
```

### 1. Experimental (`src/football/experimental/`)

- New contributions start here
- API may change without notice
- Not automatically available in BTL editor
- Requires manual import: `@breakingthelines/viz/football/experimental`

### 2. Compositions (`src/football/compositions/`)

- Promoted after validation with real data
- Stable API with semantic versioning
- Available in editor slash commands
- Breaking changes only in major versions

### Promotion Criteria

- [ ] Works with multiple data providers
- [ ] Tested with real match data
- [ ] Accessible (a11y audit passed)
- [ ] Documented with examples
- [ ] Performance acceptable (no jank)
- [ ] Code reviewed by maintainer

## Security Rules

### Banned Patterns

The following are **not allowed** in contributions:

```typescript
// ❌ No dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: content }} />

// ❌ No eval or Function constructor
eval(code);
new Function(code);

// ❌ No external fetch calls in components
fetch('https://external-api.com/data');

// ❌ No inline event handlers from strings
element.onclick = 'doSomething()';
```

### Allowed Dependencies

Only these external dependencies are permitted:

- `zod` — Schema validation
- `d3` / `d3-*` — Data visualization utilities
- `framer-motion` — Animations
- `html-to-image` — Export functionality
- `clsx` / `tailwind-merge` — Styling utilities

Adding new dependencies requires maintainer approval.

## Pull Request Process

### Before Submitting

- [ ] Code follows the style guide
- [ ] All tests pass (`bun run test`)
- [ ] Linting passes (`bun run lint`)
- [ ] Formatting is correct (`bun run format:check`)
- [ ] TypeScript compiles (`bun run check`)
- [ ] Stories are added/updated
- [ ] Documentation is updated if needed

### PR Description Template

```markdown
## Summary
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Screenshots/Videos
If applicable, add visual examples.

## Checklist
- [ ] Tests added/updated
- [ ] Stories added/updated
- [ ] Documentation updated
- [ ] No security violations
```

### Review Process

1. **Automated checks** — CI runs lint, format, test, build
2. **Code review** — Maintainer reviews code quality
3. **Visual review** — Storybook deployment reviewed
4. **Merge** — Squash and merge to main

## Style Guide

### TypeScript

- Use explicit types (no implicit `any`)
- Prefer interfaces over type aliases for objects
- Export types alongside components
- Use Zod schemas for runtime validation

### React

- Functional components only
- Use named exports (not default)
- Props interfaces named `{Component}Props`
- Destructure props in function signature

### CSS/Styling

- Use Tailwind CSS utilities
- Use `cn()` helper for conditional classes
- CSS variables for theming (`--viz-*`)
- No inline styles except for dynamic values

### File Naming

- Components: `kebab-case.tsx` (e.g., `shot-map.tsx`)
- Stories: `kebab-case.stories.tsx`
- Types: `kebab-case.ts`
- Use `index.ts` for barrel exports

## Questions?

- Open a [Discussion](https://github.com/breakingthelines/viz/discussions) for questions
- Email: hello@breakingthelines.com

## Contributor License Agreement

By contributing to this project, you agree to the [Contributor License Agreement](./CLA.md).

---

Thank you for contributing! 🎉

