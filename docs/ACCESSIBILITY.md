# Accessibility Guidelines

## WCAG 2.1 AA Compliance Checklist

### Perceivable

- [ ] All images have alt text
- [ ] Color is not the only means of conveying information
- [ ] Text contrast ratio is at least 4.5:1 (3:1 for large text)
- [ ] Text can be resized up to 200% without loss of functionality
- [ ] No content flashes more than 3 times per second

### Operable

- [ ] All functionality is keyboard accessible
- [ ] Focus indicators are visible
- [ ] Skip links are provided
- [ ] Page titles are descriptive
- [ ] Focus order is logical
- [ ] No keyboard traps

### Understandable

- [ ] Language is declared
- [ ] Navigation is consistent
- [ ] Error messages are clear and helpful
- [ ] Labels are provided for all inputs
- [ ] Instructions are clear

### Robust

- [ ] HTML is valid
- [ ] ARIA is used correctly
- [ ] Custom components are accessible
- [ ] Works with assistive technologies

## Component Patterns

### Buttons
- Use `<button>` for actions, `<a>` for navigation
- Include visible focus state
- Provide accessible name via text content or aria-label

### Forms
- Associate labels with inputs using `htmlFor`/`id`
- Group related fields with `<fieldset>` and `<legend>`
- Provide error messages linked with `aria-describedby`
- Mark required fields with `aria-required`

### Modals
- Trap focus within modal when open
- Return focus to trigger element on close
- Use `role="dialog"` and `aria-modal="true"`
- Provide accessible name with `aria-labelledby`

### Loading States
- Use `aria-busy="true"` on loading containers
- Announce completion to screen readers
- Provide visual loading indicators
