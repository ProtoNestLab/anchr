# Theming

All UI components use CSS custom properties (variables) for styling, making it easy to customize colors and support dark mode.

## CSS Variables

| Variable                 | Default            | Description                    |
| ------------------------ | ------------------ | ------------------------------ |
| `--anchor-primary`       | `#4a90d9`          | Primary accent color           |
| `--anchor-primary-hover` | `#3a7bc8`          | Primary hover state            |
| `--anchor-primary-light` | `#e8f0fe`          | Primary light background       |
| `--anchor-bg`            | `#fff`             | Background color               |
| `--anchor-text`          | `#333`             | Text color                     |
| `--anchor-text-muted`    | `#888`             | Muted/secondary text           |
| `--anchor-border`        | `#ddd`             | Border color                   |
| `--anchor-hover`         | `#f0f0f0`          | Hover background               |
| `--anchor-shadow`        | `rgba(0,0,0,0.12)` | Shadow color                   |
| `--anchor-success`       | `#28a745`          | Success color (resolved badge) |
| `--anchor-error-bg`      | `#fef2f2`          | Error banner background        |
| `--anchor-error-text`    | `#dc2626`          | Error banner text color        |
| `--anchor-error-border`  | `#fecaca`          | Error banner border color      |

## Custom Theme

```css
/* Light theme override */
:root {
  --anchor-primary: #6366f1;
  --anchor-primary-hover: #4f46e5;
  --anchor-primary-light: #eef2ff;
}
```

## Dark Mode

```css
@media (prefers-color-scheme: dark) {
  :root {
    --anchor-bg: #1e1e1e;
    --anchor-text: #e0e0e0;
    --anchor-text-muted: #888;
    --anchor-border: #333;
    --anchor-hover: #2a2a2a;
    --anchor-shadow: rgba(0, 0, 0, 0.4);
    --anchor-primary: #818cf8;
    --anchor-primary-hover: #6366f1;
    --anchor-primary-light: #1e1b4b;
    --anchor-success: #34d399;
  }
}
```

## Scoped Theme

Apply a theme to a specific section:

```html
<div
  class="my-dark-section"
  style="
  --anchor-bg: #1e1e1e;
  --anchor-text: #e0e0e0;
  --anchor-border: #333;
"
>
  <AnchorDiscussion anchor-id="dark-element">
    <p>This uses the dark theme</p>
  </AnchorDiscussion>
</div>
```
