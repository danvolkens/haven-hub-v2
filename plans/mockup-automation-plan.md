# Haven Hub Mockup Automation - Implementation Plan

## Executive Summary

This plan implements automatic mockup generation when a quote is approved, with support for:
- Default template presets (favorite templates for auto-generation)
- User settings for auto-generation behavior
- Operator Mode integration (Supervised/Assisted/Autopilot)
- Quote approval trigger

**Estimated Time**: 4-5 days

---

## Current State Analysis

### What Already Exists
1. **Mockup Templates** (`mockup_scene_templates` table)
   - 62 templates synced from Dynamic Mockups
   - Fields: `id`, `user_id`, `scene_key`, `name`, `dm_template_id`, `preview_url`, `is_active`, `is_system`
   - API: `GET/POST /api/mockups/templates/sync`

2. **Mockup Generation**
   - `POST /api/mockups/generate` - triggers mockup generation
   - `trigger/mockup-generator.ts` - Trigger.dev task for generation
   - Credit tracking via `reserve_mockup_credits()` function

3. **Design Engine Pipeline** (`trigger/design-engine.ts`)
   - Step 6 already triggers mockup generation if `generateMockups: true`
   - Passes `mockupScenes` array for template selection

4. **Quote Generation** (`POST /api/quotes/[id]/generate`)
   - Accepts `generateMockups` and `mockupScenes` parameters
   - Triggers design engine task

5. **Operator Mode** (`src/contexts/operator-mode-context.tsx`)
   - `getEffectiveMode(module)` function
   - Module overrides support
   - Guardrails checking

6. **User Settings** (`user_settings` table)
   - `global_mode`, `module_overrides`, `guardrails` columns
   - Auto-created on user signup

### What's Missing
- ❌ `is_default` column on `mockup_scene_templates`
- ❌ Mockup automation settings in `user_settings`
- ❌ Quote approval trigger for auto-generation
- ❌ Settings UI for mockup automation
- ❌ "Set as Default" UI on template cards

---

## Implementation Plan

### Phase 1: Database Schema (Migration)

**File**: `supabase/migrations/20251228000001_mockup_automation.sql`

```sql
-- Add is_default column to mockup_scene_templates
ALTER TABLE mockup_scene_templates
ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Create index for faster default template lookups
CREATE INDEX idx_mockup_templates_default
ON mockup_scene_templates(user_id, is_default)
WHERE is_default = true;

-- Add mockup automation settings to guardrails JSONB
-- (Settings stored in guardrails for consistency with existing pattern)
COMMENT ON TABLE user_settings IS
'Mockup automation settings stored in guardrails:
  mockup_auto_generate (bool),
  mockup_use_defaults (bool),
  mockup_max_per_quote (int),
  mockup_notify_on_complete (bool)';
```

### Phase 2: API Routes

#### 2.1 Default Templates API
**File**: `src/app/api/mockups/templates/defaults/route.ts`

```typescript
// GET - Fetch default templates for user
// PATCH - Set/unset template as default
// POST - Bulk set defaults
```

#### 2.2 Mockup Settings API
**File**: `src/app/api/settings/mockup-automation/route.ts`

```typescript
// GET - Fetch mockup automation settings
// PATCH - Update mockup automation settings
```

#### 2.3 Quote Approval Trigger (Modify Existing)
**File**: `src/app/api/approvals/[id]/route.ts` (enhance existing)

Add logic to:
1. Detect when asset approval happens
2. Check if mockup_auto_generate is enabled
3. Get default templates
4. Queue mockup generation

### Phase 3: Trigger.dev Task Updates

#### 3.1 Auto-Mockup Queue Task
**File**: `trigger/auto-mockup-queue.ts`

New task that:
1. Receives approved asset IDs
2. Fetches user's mockup settings
3. Gets default templates (respecting max limit)
4. Checks Operator Mode
5. Triggers mockup-generator task with appropriate settings

#### 3.2 Update Design Engine (Optional Enhancement)
The design engine already supports mockup generation. We can also trigger auto-mockups there when assets are auto-approved.

### Phase 4: Frontend UI

#### 4.1 Template Card Default Toggle
**File**: `src/app/(dashboard)/dashboard/pinterest/mockups/page.tsx`

Add:
- Star/heart icon to mark templates as default
- Visual indicator for default templates
- "X defaults selected" counter

#### 4.2 Settings UI - Mockup Automation Section
**File**: `src/app/(dashboard)/dashboard/settings/page.tsx`

New section with:
- Toggle: "Auto-generate mockups on quote approval"
- Number input: "Max mockups per quote"
- Toggle: "Use default templates only"
- Link: "Manage default templates →"
- Toggle: "Notify on completion"

#### 4.3 Generate Assets Page Enhancement
**File**: Update Generate Assets UI

Add:
- "Use Defaults" button that loads saved default templates
- Visual indicator showing which templates are defaults

### Phase 5: Operator Mode Integration

Behavior by mode:

| Mode | Auto-Gen Behavior | Result Location |
|------|-------------------|-----------------|
| Supervised | Generate → Hold for review | Approval Queue |
| Assisted | Generate → Auto-save | Asset Library |
| Autopilot | Generate → Save → Attach to Shopify | Full automation |

### Phase 6: Notification System

When auto-generation completes:
- **Toast notification**: "5 mockups generated for [Quote]"
- **Dashboard badge**: Update approval count if in Supervised mode
- **Activity log entry**: Record what was generated

---

## Detailed File Changes

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20251228000001_mockup_automation.sql` | Schema changes |
| `src/app/api/mockups/templates/defaults/route.ts` | Default templates CRUD |
| `src/app/api/settings/mockup-automation/route.ts` | Settings API |
| `trigger/auto-mockup-queue.ts` | Background job orchestrator |
| `src/lib/mockups/auto-generation-service.ts` | Business logic |

### Modified Files

| File | Changes |
|------|---------|
| `src/app/api/approvals/[id]/route.ts` | Add approval trigger hook |
| `trigger/design-engine.ts` | Add auto-mockup for auto-approved assets |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | Add Mockup Automation section |
| `src/types/database.ts` | Add mockup automation types |
| `src/types/mockups.ts` | Add `is_default` field |

---

## Implementation Order

### Day 1: Database & Core API ✅
1. [x] Create migration for `is_default` column
2. [x] Run migration: `npx supabase db push`
3. [x] Create `/api/mockups/templates/defaults` route
4. [x] Create `/api/settings/mockup-automation` route
5. [x] Update TypeScript types

### Day 2: Trigger Logic ✅
1. [x] Create `trigger/auto-mockup-queue.ts` task
2. [x] Create `src/lib/mockups/auto-generation-service.ts`
3. [x] Add approval trigger hook in `/api/approvals/[id]/route.ts`
4. [x] Add approval trigger hook in `/api/approvals/bulk/route.ts`

### Day 3: Settings UI ✅
1. [x] Add "Mockup Automation" section to Settings page
2. [x] Create `/dashboard/settings/mockup-automation` page
3. [x] Implement toggles and number inputs
4. [x] Add "Manage Defaults" link

### Day 4: Template UI & Polish ✅
1. [x] Add "Set as Default" toggle (star icon) to template cards
2. [x] Add default count indicator in filter area
3. [x] Show default templates preview in automation settings

### Day 5: Operator Mode & Testing ✅
1. [x] Operator Mode already integrated in mockup-generator.ts
2. [x] Supervised mode: creates approval items
3. [x] Assisted mode: creates approval items (non-autopilot)
4. [x] Autopilot mode: auto-approves mockups
5. [x] Build verified successfully

---

## Testing Checklist

### Unit Tests
- [ ] Default template toggling
- [ ] Settings persistence
- [ ] Credit checking before generation

### Integration Tests
- [ ] Asset approval → mockup generation flow
- [ ] Operator mode respects settings
- [ ] Max per quote limit enforced

### Manual Testing
- [ ] Approve asset with auto-generate ON → mockups appear
- [ ] Approve asset with auto-generate OFF → no mockups
- [ ] Supervised mode → mockups in approval queue
- [ ] Assisted mode → mockups in asset library
- [ ] Credit limit respected

---

## Rollback Plan

If issues occur:
1. Feature flag: Add `MOCKUP_AUTO_GENERATION_ENABLED` env var
2. Database: Migration is additive (just adds column), safe to leave
3. UI: Settings section can be hidden via feature flag

---

## Future Enhancements (Out of Scope)

- Multiple preset groups ("Pinterest Set", "Product Pages", etc.)
- Template performance analytics (which scenes get most saves)
- A/B testing for mockup scenes
- Bulk retry failed mockups
