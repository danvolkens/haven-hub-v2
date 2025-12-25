# Haven Hub v2 - UX/UI Audit Report

**Audit Date**: December 25, 2025
**Auditor**: UX/UI Design Review
**Scope**: Comprehensive review of design system, user flows, accessibility, and responsive design

---

## Executive Summary

Haven Hub v2 demonstrates a solid foundation with a well-structured design system and consistent component library. The codebase follows modern React patterns and includes thoughtful accessibility features. However, there are several areas requiring attention, primarily around accessibility compliance, interactive state consistency, and responsive design refinement.

**Overall Score**: 7.5/10

### Key Strengths
- Cohesive color system with CSS custom properties
- Well-structured component library using CVA (class-variance-authority)
- Good use of semantic HTML in form components
- Comprehensive keyboard navigation in key areas (command palette, approval queue)
- Skip link and accessibility helper components included

### Priority Areas for Improvement
- Incomplete ARIA labeling across interactive elements
- Missing focus indicators on several custom components
- Inconsistent spacing tokens in some dashboard components
- Limited touch target sizes on mobile
- Color contrast issues in secondary text elements

---

## Issue Categories

### Severity Definitions

| Severity | Description |
|----------|-------------|
| **Critical** | Blocks users from completing tasks or causes accessibility failures (WCAG A violations) |
| **Major** | Significantly impacts user experience or causes WCAG AA violations |
| **Minor** | Small friction points or best practice improvements |

---

## 1. Design System Consistency

### 1.1 Color System Analysis

**File**: `/Users/dvolkens/haven-hub-v2/src/app/globals.css`

The color system is well-organized with CSS custom properties. However, there are inconsistencies in usage:

#### Issue #1: Inconsistent Color Token Usage [Minor]

**Location**: Multiple component files
**Finding**: Some components use raw color values instead of design tokens.

**Examples**:
- `/Users/dvolkens/haven-hub-v2/src/components/dashboard/dashboard-stats.tsx` (Lines 62-84):
  ```typescript
  color: 'text-green-600 bg-green-100',  // Uses Tailwind defaults
  color: 'text-blue-600 bg-blue-100',
  color: 'text-purple-600 bg-purple-100',
  color: 'text-red-600 bg-red-100',
  ```

**Recommendation**: Replace with design system tokens:
- Use `text-success`/`bg-success/10` instead of `text-green-600`/`bg-green-100`
- Use `text-info`/`bg-info/10` instead of `text-blue-600`/`bg-blue-100`
- Use `text-error`/`bg-error/10` instead of `text-red-600`/`bg-red-100`

---

#### Issue #2: Hardcoded Colors in Command Palette [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/command-palette/command-palette.tsx`
**Lines**: 291, 352, 388-391

```typescript
// Line 291
<kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded border">

// Line 352
<div className="px-4 py-2 border-t bg-gray-50 flex...">

// Lines 388-391
className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
  isSelected ? 'bg-sage-100 text-sage-900' : 'hover:bg-gray-50'
}`}
```

**Recommendation**: Use `bg-elevated` instead of `bg-gray-50`/`bg-gray-100` for consistency.

---

### 1.2 Typography Consistency

#### Issue #3: Mixed Typography Approaches [Minor]

**Finding**: The design system defines custom typography classes (`.text-h1`, `.text-body`, etc.) but components sometimes use raw Tailwind classes.

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/landing-pages/builder/page-builder.tsx`
**Line**: 189
```typescript
<p>Drag blocks from the left panel to start building</p>
```

**Recommendation**: Use `text-body text-[var(--color-text-secondary)]` for consistent styling.

---

### 1.3 Spacing Inconsistencies

#### Issue #4: Inconsistent Padding in Cards [Minor]

**Finding**: Card padding varies across the application without clear reasoning.

**Examples**:
- `dashboard-stats.tsx`: Uses `p-4`
- `quick-actions.tsx`: Uses `p-4`
- `settings/page.tsx`: Uses mixed `p-6` and default Card padding
- `quote-form.tsx`: Uses `p-6` in CardContent

**Recommendation**: Establish clear card padding guidelines:
- Standard cards: `p-4` (16px)
- Feature/hero cards: `p-6` (24px)
- Compact cards: `p-3` (12px)

---

## 2. Accessibility Issues

### 2.1 Critical Accessibility Issues

#### Issue #5: Missing Skip Link Target [Critical]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/ui/skip-link.tsx`
**Lines**: 1-10

The skip link targets `#main-content` but the dashboard layout does not have a corresponding `id="main-content"` on the main element.

**Current Code**:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only...">
```

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/layout.tsx`
**Line**: 41
```tsx
<main className="p-4 lg:p-6">{children}</main>
```

**Recommendation**: Add `id="main-content"` to the main element:
```tsx
<main id="main-content" className="p-4 lg:p-6">{children}</main>
```

---

#### Issue #6: Missing Form Labels in Campaign Wizard [Critical]

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/campaigns/new/page.tsx`
**Lines**: 245-254

The description textarea uses a native `<textarea>` without proper label association:

```tsx
<Label htmlFor="description">Description (optional)</Label>
<textarea
  id="description"
  className="w-full px-3 py-2 rounded-md border..."
```

**Issue**: Uses native textarea instead of the styled `Textarea` component, missing error handling and accessibility features.

**Recommendation**: Use the design system `Textarea` component for consistency and accessibility.

---

#### Issue #7: Interactive Elements Missing ARIA Labels [Major]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/select.tsx`
**Lines**: 153-159

The clear and remove value buttons lack accessible labels:

```tsx
<X
  className="h-3 w-3 cursor-pointer hover:text-error"
  onClick={(e) => handleRemoveValue(v, e)}
/>
```

**Recommendation**:
```tsx
<button
  type="button"
  aria-label={`Remove ${option?.label}`}
  onClick={(e) => handleRemoveValue(v, e)}
>
  <X className="h-3 w-3" />
</button>
```

---

#### Issue #8: Tab Panel Missing tabindex [Major]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/ui/tabs.tsx`
**Lines**: 100-111

The `TabsContent` component renders `role="tabpanel"` but is missing `tabindex="0"` for keyboard focus.

**Current Code**:
```tsx
<div
  role="tabpanel"
  className={cn('mt-2 ring-offset-background...')}
>
```

**Recommendation**:
```tsx
<div
  role="tabpanel"
  tabIndex={0}
  aria-labelledby={`tab-${value}`}
  className={cn('mt-2 ring-offset-background...')}
>
```

---

#### Issue #9: Images Missing Alt Text [Major]

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/pinterest/page.tsx`
**Line**: 361

```tsx
<img
  src={pin.image_url}
  alt={pin.title}
  className="absolute inset-0 w-full h-full object-cover"
/>
```

**Note**: This is correctly implemented. However, check Line 452:
```tsx
<img
  src={pin.image_url}
  alt={pin.title}
  className="w-16 h-16 rounded object-cover"
/>
```

**Status**: Good - alt text is provided.

---

### 2.2 Color Contrast Issues

#### Issue #10: Insufficient Contrast for Tertiary Text [Major]

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/globals.css`
**Line**: 42

```css
--color-text-tertiary: #8A9BAA;
```

**Analysis**: The tertiary text color `#8A9BAA` on the canvas background `#FAFAF8` yields a contrast ratio of approximately 3.2:1, which fails WCAG AA requirements for normal text (4.5:1).

**Recommendation**: Darken tertiary text to at least `#6B7A8A` for 4.5:1 contrast ratio.

---

#### Issue #11: Warning Badge Contrast [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/globals.css`
**Line**: 21

```css
--color-warning: #D4A574;
```

**Analysis**: The warning color `#D4A574` may have contrast issues when used for small text.

**Recommendation**: Ensure warning text is always rendered at font-weight 500+ or use a darker variant for text applications.

---

### 2.3 Keyboard Navigation Issues

#### Issue #12: Select Component Keyboard Navigation [Major]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/ui/select.tsx`
**Lines**: 114-121

The Select component handles Escape and Enter but is missing:
- Arrow key navigation through options
- Home/End key support
- Type-ahead/search while focused

**Current Code**:
```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    setIsOpen(false);
    setSearchQuery('');
  } else if (e.key === 'Enter' && !isOpen) {
    setIsOpen(true);
  }
};
```

**Recommendation**: Add full keyboard navigation:
```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'Escape':
      setIsOpen(false);
      break;
    case 'Enter':
    case ' ':
      if (!isOpen) setIsOpen(true);
      else if (highlightedIndex >= 0) handleSelect(filteredOptions[highlightedIndex].value);
      break;
    case 'ArrowDown':
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
      break;
    case 'Home':
      setHighlightedIndex(0);
      break;
    case 'End':
      setHighlightedIndex(filteredOptions.length - 1);
      break;
  }
};
```

---

#### Issue #13: Modal Focus Management [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/ui/modal.tsx`
**Lines**: 56-93

The modal has good focus trap implementation but could be improved:

**Observation**: Focus is moved to the first focusable element. For destructive confirmations, focus should go to the non-destructive action.

**Recommendation**: Add a `defaultFocus` prop to control initial focus target.

---

## 3. Interactive States

### 3.1 Button States

#### Issue #14: Missing Active State Visual Feedback [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/ui/button.tsx`
**Lines**: 12-17

The button variants include `active:` states but they're subtle. Consider adding more distinct visual feedback:

```typescript
primary: 'bg-sage text-white hover:bg-sage/90 active:bg-sage/80',
```

**Recommendation**: Add transform for tactile feedback:
```typescript
primary: 'bg-sage text-white hover:bg-sage/90 active:bg-sage/80 active:scale-[0.98]',
```

---

### 3.2 Form Input States

#### Issue #15: Missing Readonly State Styling [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/ui/input.tsx`

The Input component handles disabled state but not readonly state.

**Recommendation**: Add readonly styling:
```typescript
'read-only:bg-elevated read-only:cursor-default',
```

---

### 3.3 Loading States

#### Issue #16: Inconsistent Loading Indicators [Minor]

**Finding**: Loading states use different patterns across the application:

- Button: Uses `Loader2` with `animate-spin` (good)
- Lists: Uses `Loader2` alone
- Skeleton: Uses `animate-pulse` (good)

**Location Examples**:
- `/Users/dvolkens/haven-hub-v2/src/components/approval-queue/approval-queue-list.tsx` Line 151
- `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/pinterest/page.tsx` Line 265

**Recommendation**: Create a standardized `LoadingSpinner` component with size variants.

---

## 4. Responsive Design

### 4.1 Touch Target Sizes

#### Issue #17: Small Touch Targets [Major]

**Location**: Multiple files

Several interactive elements have touch targets smaller than the recommended 44x44px minimum.

**Examples**:

1. **Quick Actions buttons** (`quick-actions.tsx`):
   ```tsx
   className="h-auto py-3 flex-col gap-1"
   ```
   The `py-3` (12px) is insufficient for comfortable mobile tapping.

2. **Notification badge close** (`header.tsx` Line 185):
   ```tsx
   <div className="mt-2 h-2 w-2 rounded-full bg-sage" />
   ```
   This is decorative, not a button - correct as-is.

3. **Select clear button** (`select.tsx` Line 168):
   ```tsx
   <X className="h-4 w-4 text-[var(--color-text-tertiary)]..." />
   ```
   Touch target is only 16x16px.

**Recommendation**: Wrap small interactive icons in buttons with minimum 44px touch target:
```tsx
<button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
  <X className="h-4 w-4" />
</button>
```

---

### 4.2 Sidebar Responsive Behavior

#### Issue #18: Sidebar Width Not Synced with Layout [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/layout.tsx`
**Lines**: 33-38

The layout assumes the sidebar is always 256px (w-64):

```tsx
<div
  className={cn(
    'transition-all duration-300',
    'lg:ml-64' // Will need to be dynamic based on collapsed state
  )}
>
```

The comment indicates this is a known issue. The sidebar can collapse to 64px but the main content margin doesn't respond.

**Recommendation**:
1. Lift sidebar collapsed state to a context/store
2. Make margin responsive: `lg:ml-16` when collapsed, `lg:ml-64` when expanded

---

### 4.3 Mobile Navigation

#### Issue #19: Mobile Sheet Sidebar Sizing [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/layout.tsx`
**Lines**: 23-31

```tsx
<Sheet
  isOpen={mobileMenuOpen}
  onClose={() => setMobileMenuOpen(false)}
  side="left"
  size="sm"  // Only 320px wide
  showCloseButton={false}
>
  <Sidebar />
</Sheet>
```

**Issue**: The `size="sm"` (w-80 = 320px) may be too narrow for the sidebar content.

**Recommendation**: Use `size="md"` (w-96 = 384px) for better content fit.

---

### 4.4 Table/Grid Responsiveness

#### Issue #20: Pinterest Pins Grid on Small Screens [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/pinterest/page.tsx`
**Line**: 353

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
```

**Observation**: On mobile (<768px), pins stack in a single column which may be inefficient for browsing.

**Recommendation**: Consider 2-column grid on larger mobile screens:
```tsx
<div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
```

---

## 5. Form UX

### 5.1 Validation Patterns

#### Issue #21: Inline Validation Timing [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/quotes/quote-form.tsx`
**Lines**: 120-138

Form validation only occurs on submit. Consider adding:
- `onBlur` validation for individual fields
- Real-time character count feedback (already implemented for textarea)

**Current Behavior**: User must submit to see validation errors.

**Recommendation**: Add blur validation:
```tsx
const validateField = (name: string, value: string) => {
  if (name === 'text' && !value.trim()) {
    return 'Quote text is required';
  }
  return null;
};
```

---

### 5.2 Error Recovery

#### Issue #22: Error Messages Not Linked to Inputs [Major]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/ui/input.tsx`
**Lines**: 37-38

The error message uses `aria-describedby` but only when an `id` is provided:

```tsx
aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
```

**Issue**: If no `id` is passed, the error won't be associated with the input.

**Recommendation**: Generate an ID if not provided:
```tsx
const generatedId = React.useId();
const inputId = id || generatedId;
```

---

### 5.3 Form Layout

#### Issue #23: Campaign Wizard Form Spacing [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/campaigns/new/page.tsx`
**Lines**: 223-255

Form field spacing is inconsistent:
- Uses `space-y-6` for the container
- Uses `space-y-2` for label/input groups
- Date inputs use `gap-4` in grid

**Recommendation**: Standardize to:
- `space-y-6` between form sections
- `space-y-2` between label and input
- `gap-6` for grid layouts

---

## 6. Visual Hierarchy

### 6.1 Page Headers

#### Issue #24: Inconsistent Page Header Patterns [Minor]

**Finding**: Some pages use `PageContainer` consistently while others have custom headers.

**Good Examples**:
- Dashboard: Uses `PageContainer` with title and description
- Approvals: Clean `PageContainer` usage

**Inconsistent Examples**:
- Pinterest page: Custom header with status text
- Settings: Mixes `PageContainer` with internal card headers

**Recommendation**: Document `PageContainer` usage guidelines:
- Always use for top-level pages
- Use `actions` prop for primary CTAs
- Limit description to 1-2 sentences

---

### 6.2 Empty States

#### Issue #25: Inconsistent Empty State Styling [Minor]

**Finding**: Empty states vary in design and messaging.

**Examples**:
- Pinterest (no boards): Custom card with icon, heading, description, and CTA
- Approval queue: Uses dedicated `ApprovalEmptyState` component
- Page builder: Simple paragraph text

**Recommendation**: Create a reusable `EmptyState` component:
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

## 7. Motion & Animation

### 7.1 Animation Consistency

#### Issue #26: Mixed Animation Approaches [Minor]

**Location**: Various files

The codebase uses both CSS-in-JS and CSS animations:

- `globals.css`: Defines `@keyframes` for fadeIn, slideUp, etc.
- `sheet.tsx`: Uses inline `<style jsx>` for slideIn animations
- Components: Use Tailwind's `animate-` classes

**Recommendation**: Consolidate animations:
1. Move all keyframes to `globals.css`
2. Use CSS custom properties for timing
3. Create utility classes for common animations

---

### 7.2 Reduced Motion Support

#### Issue #27: No prefers-reduced-motion Support [Major]

**Location**: `/Users/dvolkens/haven-hub-v2/src/app/globals.css`

The animation keyframes don't respect `prefers-reduced-motion`.

**Recommendation**: Add motion-safe wrapper:
```css
@media (prefers-reduced-motion: no-preference) {
  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Component-Specific Issues

### 8.1 Approval Queue

#### Issue #28: Keyboard Shortcut Discoverability [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/approval-queue/approval-queue-list.tsx`
**Lines**: 304-310

The keyboard shortcuts hint at the bottom is easy to miss.

**Recommendation**: Add an onboarding tooltip or make shortcuts visible in a header bar.

---

### 8.2 Page Builder

#### Issue #29: Missing Undo/Redo Functionality [Minor]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/landing-pages/builder/page-builder.tsx`

The page builder lacks undo/redo functionality, which is critical for content editors.

**Recommendation**: Implement history stack for block changes using `useReducer` or a state management library.

---

### 8.3 Command Palette

#### Issue #30: Dialog Missing aria-label [Major]

**Location**: `/Users/dvolkens/haven-hub-v2/src/components/command-palette/command-palette.tsx`
**Lines**: 272-276

```tsx
<div
  role="dialog"
  aria-modal="true"
  className="relative z-50 w-full max-w-lg..."
>
```

**Issue**: The dialog is missing `aria-label` or `aria-labelledby`.

**Recommendation**:
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-label="Command palette"
  className="relative z-50 w-full max-w-lg..."
>
```

---

## 9. Summary of Fixes by Priority

### Critical (Must Fix)

| Issue | Location | Effort |
|-------|----------|--------|
| #5: Missing skip link target | layout.tsx | 5 min |
| #6: Missing form labels | campaigns/new/page.tsx | 15 min |

### Major (High Priority)

| Issue | Location | Effort |
|-------|----------|--------|
| #7: Interactive elements missing ARIA | select.tsx | 30 min |
| #8: Tab panel missing tabindex | tabs.tsx | 10 min |
| #10: Insufficient text contrast | globals.css | 10 min |
| #12: Select keyboard navigation | select.tsx | 2 hours |
| #17: Small touch targets | Multiple | 2 hours |
| #22: Error messages not linked | input.tsx | 30 min |
| #27: No reduced motion support | globals.css | 30 min |
| #30: Command palette aria-label | command-palette.tsx | 5 min |

### Minor (Should Fix)

| Issue | Location | Effort |
|-------|----------|--------|
| #1: Inconsistent color tokens | dashboard-stats.tsx | 15 min |
| #2: Hardcoded colors | command-palette.tsx | 10 min |
| #3: Mixed typography | page-builder.tsx | 10 min |
| #4: Inconsistent card padding | Multiple | 30 min |
| #11: Warning badge contrast | globals.css | 10 min |
| #13: Modal focus management | modal.tsx | 1 hour |
| #14: Missing active state | button.tsx | 10 min |
| #15: Missing readonly state | input.tsx | 10 min |
| #16: Inconsistent loading | Multiple | 1 hour |
| #18: Sidebar width sync | layout.tsx | 1 hour |
| #19: Mobile sheet sizing | layout.tsx | 5 min |
| #20: Pinterest grid responsive | pinterest/page.tsx | 10 min |
| #21: Inline validation timing | quote-form.tsx | 30 min |
| #23: Form spacing | campaigns/new/page.tsx | 20 min |
| #24: Page header patterns | Documentation | 1 hour |
| #25: Empty state styling | Create component | 2 hours |
| #26: Animation approaches | globals.css, sheet.tsx | 1 hour |
| #28: Keyboard discoverability | approval-queue-list.tsx | 30 min |
| #29: Undo/redo | page-builder.tsx | 4 hours |

---

## 10. Recommendations for Design System Enhancement

### 10.1 Create Missing Components

1. **LoadingSpinner**: Standardized loading indicator with size variants
2. **EmptyState**: Reusable empty state with icon, title, description, action
3. **FormField**: Wrapper component that handles label, input, error, and helper text together
4. **IconButton**: Button variant specifically for icon-only interactions with proper sizing

### 10.2 Document Design Tokens

Create a design tokens documentation file that exports:
- Color values with contrast ratios
- Spacing scale with use cases
- Typography scale with semantic names
- Animation timing and easing functions

### 10.3 Add Storybook or Component Documentation

Consider adding Storybook to document:
- All component variants
- Interactive states
- Accessibility requirements
- Usage examples

---

## Appendix: Files Reviewed

### UI Components
- `/Users/dvolkens/haven-hub-v2/src/components/ui/button.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/card.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/input.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/textarea.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/select.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/checkbox.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/switch.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/modal.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/sheet.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/tabs.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/badge.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/alert.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/progress.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/slider.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/skeleton.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/label.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/skip-link.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/accessible-icon.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/ui/visually-hidden.tsx`

### Layout Components
- `/Users/dvolkens/haven-hub-v2/src/components/layout/sidebar.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/layout/header.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/layout/page-container.tsx`

### Dashboard Pages
- `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/layout.tsx`
- `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/page.tsx`
- `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/approvals/page.tsx`
- `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/campaigns/new/page.tsx`
- `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/pinterest/page.tsx`
- `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/quotes/new/page.tsx`
- `/Users/dvolkens/haven-hub-v2/src/app/(dashboard)/dashboard/settings/page.tsx`

### Feature Components
- `/Users/dvolkens/haven-hub-v2/src/components/dashboard/dashboard-stats.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/dashboard/quick-actions.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/approval-queue/approval-queue-list.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/quotes/quote-form.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/command-palette/command-palette.tsx`
- `/Users/dvolkens/haven-hub-v2/src/components/landing-pages/builder/page-builder.tsx`

### Styles
- `/Users/dvolkens/haven-hub-v2/src/app/globals.css`

---

*Report generated by UX/UI Design Audit - Haven Hub v2*
