#!/bin/bash
#===============================================================================
# Haven Hub v2 Automated Builder - Optimized v3
#
# Key optimizations:
# 1. Step extraction - only send relevant step content to Claude
# 2. Pre-flight checks - verify environment before starting
# 3. Auto Supabase types - regenerate after migrations
# 4. Error caching - detect stuck loops with same error
# 5. File existence hints - tell Claude what exists/missing
# 6. Smarter retries - different prompts for repeated failures
# 7. Directory pre-creation - less work for Claude
#===============================================================================

set -uo pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
PLANS_DIR="${PLANS_DIR:-./plans}"
LOG_DIR="${LOG_DIR:-./build-logs}"
STATE_FILE=".build-state.json"
EXTRACTED_DIR=".extracted-steps"
LAST_ERROR_FILE=".last-build-error"

MAX_RETRIES=3
STEP_TIMEOUT=1200
VERIFY_TIMEOUT=600
FIX_TIMEOUT=600

IMPLEMENT_TURNS=60
VERIFY_TURNS=30
FIX_TURNS=25

GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GITHUB_REPO="https://github.com/danvolkens/haven-hub-v2"

#-------------------------------------------------------------------------------
# Colors
#-------------------------------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

timestamp() { date +'%Y-%m-%d %H:%M:%S'; }
log()     { echo -e "${GREEN}[$(timestamp)]${NC} $1"; }
info()    { echo -e "${BLUE}[$(timestamp)]${NC} $1"; }
warn()    { echo -e "${YELLOW}[$(timestamp)]${NC} ⚠️  $1"; }
error()   { echo -e "${RED}[$(timestamp)]${NC} ❌ $1"; }
success() { echo -e "${GREEN}[$(timestamp)]${NC} ✅ $1"; }

header() {
    echo -e "\n${CYAN}══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}══════════════════════════════════════════════════════${NC}\n"
}

#-------------------------------------------------------------------------------
# Pre-flight Checks
#-------------------------------------------------------------------------------
preflight() {
    local errors=0
    info "Pre-flight checks..."
    
    command -v node &>/dev/null && log "Node $(node -v)" || { error "Node not found"; ((errors++)); }
    
    # Check Claude CLI works
    if command -v claude &>/dev/null; then
        log "Claude CLI ✓"
    else
        error "Claude CLI not found"
        ((errors++))
    fi
    
    # Check for plan files
    local plan_count=0
    for i in {1..11}; do
        [[ -f "$PLANS_DIR/haven-hub-plan-part${i}.md" ]] && ((plan_count++))
    done
    
    if [[ $plan_count -gt 0 ]]; then
        log "Found $plan_count plan files in $PLANS_DIR"
    else
        error "No plan files found in $PLANS_DIR"
        error "Expected: $PLANS_DIR/haven-hub-plan-part1.md through part11.md"
        ((errors++))
    fi
    
    [[ "$OSTYPE" == "darwin"* ]] && ! command -v gtimeout &>/dev/null && warn "gtimeout not found (brew install coreutils)"
    
    [[ $errors -gt 0 ]] && { error "Pre-flight failed"; return 1; }
    success "Pre-flight passed"
}

#-------------------------------------------------------------------------------
# Directory Setup
#-------------------------------------------------------------------------------
ensure_dirs() {
    mkdir -p src/app/{api,\(auth\),\(dashboard\)/dashboard,\(public\)} \
             src/components/ui src/lib/supabase src/hooks src/types \
             trigger supabase/migrations "$LOG_DIR" "$EXTRACTED_DIR"
}

#-------------------------------------------------------------------------------
# Supabase Types
#-------------------------------------------------------------------------------
regen_types() {
    if command -v supabase &>/dev/null || npx supabase --version &>/dev/null 2>&1; then
        npx supabase gen types typescript --local > src/types/supabase.ts 2>/dev/null && info "Types regenerated" || true
    fi
}

#-------------------------------------------------------------------------------
# State Management
#-------------------------------------------------------------------------------
init_state() {
    [[ -f "$STATE_FILE" ]] || echo '{"current_part":1,"current_step":1,"completed_parts":[],"completed_steps":[],"failed":[]}' > "$STATE_FILE"
    mkdir -p "$EXTRACTED_DIR" "$LOG_DIR"
}

get_state() { jq -r ".$1" "$STATE_FILE"; }
set_state() { jq ".$1 = $2" "$STATE_FILE" > tmp.$$ && mv tmp.$$ "$STATE_FILE"; }
add_completed() { jq ".completed_steps += [\"$1\"]" "$STATE_FILE" > tmp.$$ && mv tmp.$$ "$STATE_FILE"; }
is_done() { jq -e ".completed_steps | index(\"$1\")" "$STATE_FILE" &>/dev/null; }

show_status() {
    header "Build Status"
    echo "Position: Part $(get_state current_part), Step $(get_state current_step)"
    echo "Completed: $(jq '.completed_steps | length' "$STATE_FILE") steps"
    echo "Parts done: $(jq -r '.completed_parts | join(", ")' "$STATE_FILE")"
}

#-------------------------------------------------------------------------------
# Step Extraction
#-------------------------------------------------------------------------------
extract_step() {
    local part=$1 step=$2
    local plan="$PLANS_DIR/haven-hub-plan-part${part}.md"
    local out="$EXTRACTED_DIR/p${part}s${step}.md"
    
    [[ -f "$plan" ]] || { error "Plan not found: $plan"; return 1; }
    
    awk -v s="$step" '/^## Step/{n++} n==s{p=1} n>s{exit} p' "$plan" > "$out"
    [[ -s "$out" ]] && echo "$out" || { error "Extract failed"; return 1; }
}

step_title() {
    grep "^## Step" "$PLANS_DIR/haven-hub-plan-part${1}.md" | sed -n "${2}p" | sed 's/## Step [0-9.]*: //'
}

count_steps() {
    local plan="$PLANS_DIR/haven-hub-plan-part${1}.md"
    if [[ -f "$plan" ]]; then
        grep -c "^## Step" "$plan"
    else
        echo 0
    fi
}

# Get files expected from step - maps plan paths to actual src/ paths
get_expected_files() {
    local step_file=$1
    local files=""
    
    # Extract raw paths from the step
    local raw_paths=$(grep -oE '(app/|components/|lib/|hooks/|types/|trigger/|supabase/)[a-zA-Z0-9/_.-]+\.(ts|tsx|sql)' "$step_file" 2>/dev/null | sort -u)
    
    for path in $raw_paths; do
        # Map to actual location
        case "$path" in
            app/*|components/*|lib/*|hooks/*|types/*)
                # These go under src/
                files+="src/$path "
                ;;
            trigger/*|supabase/migrations/*)
                # These stay at root
                files+="$path "
                ;;
            supabase/*.ts)
                # supabase/*.ts files go to src/lib/supabase/
                local filename=$(basename "$path")
                files+="src/lib/supabase/$filename "
                ;;
            *)
                files+="$path "
                ;;
        esac
    done
    
    echo "$files"
}

#-------------------------------------------------------------------------------
# Build Helpers
#-------------------------------------------------------------------------------
build_ok() { npm run build &>/dev/null; }

get_errors() {
    npm run build 2>&1 | grep -A4 "error\|Error" | head -30
}

save_error() { echo "$1" > "$LAST_ERROR_FILE"; }
last_error() { cat "$LAST_ERROR_FILE" 2>/dev/null; }
same_error() { [[ -f "$LAST_ERROR_FILE" ]] && [[ "$(echo "$1" | md5sum)" == "$(last_error | md5sum)" ]]; }

run_migrations() {
    ls supabase/migrations/*.sql &>/dev/null && {
        info "Running migrations..."
        npx supabase db push 2>&1 || true
        regen_types
    }
}

#-------------------------------------------------------------------------------
# Claude Runner (real-time output)
#-------------------------------------------------------------------------------
run_claude() {
    local prompt="$1" turns=${2:-50} timeout=${3:-600} logfile="${4:-/dev/null}"
    
    info "Claude ($turns turns):"
    echo "─────────────────────────────────────────────"
    
    # Write prompt to temp file  
    local pf=$(mktemp)
    printf '%s' "$prompt" > "$pf"
    
    # Create wrapper script
    local wrapper=$(mktemp)
    cat > "$wrapper" << EOF
#!/bin/bash
claude -p "\$(cat '$pf')" --allowedTools Bash,Read,Write,Edit --max-turns $turns
EOF
    chmod +x "$wrapper"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac: script -q file command - outputs to both terminal and file
        if command -v gtimeout &>/dev/null; then
            script -q "$logfile" gtimeout "$timeout" "$wrapper"
        else
            script -q "$logfile" "$wrapper"
        fi
    else
        # Linux: script -q -c "command" file
        if command -v gtimeout &>/dev/null; then
            script -q -c "timeout $timeout $wrapper" "$logfile"
        else
            script -q -c "timeout $timeout $wrapper" "$logfile"
        fi
    fi
    
    rm -f "$pf" "$wrapper"
    echo ""
    echo "─────────────────────────────────────────────"
    info "Claude session ended"
    sleep 1
    return 0
}

#-------------------------------------------------------------------------------
# Implement Step
#-------------------------------------------------------------------------------
implement() {
    local part=$1 step=$2
    local title=$(step_title "$part" "$step")
    local logf="$LOG_DIR/p${part}s${step}-impl-$(date +%H%M%S).log"
    
    log "Part $part Step $step: $title"
    
    local sf=$(extract_step "$part" "$step") || return 1
    
    # Check existing files
    local expected=$(get_expected_files "$sf")
    local existing="" missing=""
    for f in $expected; do
        [[ -f "$f" ]] && existing+=" $f" || missing+=" $f"
    done
    
    local hint=""
    [[ -n "$existing" ]] && hint+="EXISTS:$existing
"
    [[ -n "$missing" ]] && hint+="CREATE:$missing
"
    
    run_claude "IMPLEMENT step below.
$hint
PATHS: app/→src/app/ components/→src/components/ lib/→src/lib/ hooks/→src/hooks/ types/→src/types/
ROOT (no src): trigger/ supabase/

DO:
1. Create files shown
2. npx supabase db push (if .sql)
3. npm run build
4. Fix errors ('as any' for Supabase types)

---STEP---
$(cat "$sf")
---END---

START." "$IMPLEMENT_TURNS" "$STEP_TIMEOUT" "$logf"
    
    run_migrations
    info "Checking build..."
}

#-------------------------------------------------------------------------------
# Verify/Fix
#-------------------------------------------------------------------------------
verify() {
    local part=$1 step=$2
    local logf="$LOG_DIR/p${part}s${step}-verify.log"
    local sf="$EXTRACTED_DIR/p${part}s${step}.md"
    
    # First check: did all expected files get created?
    local expected=$(get_expected_files "$sf")
    local missing=""
    for f in $expected; do
        [[ ! -f "$f" ]] && missing+=" $f"
    done
    
    if [[ -n "$missing" ]]; then
        warn "Missing files:$missing"
        
        # Ask Claude to create missing files
        run_claude "MISSING FILES - create these:
$missing

Read the step content and create each missing file:
---
$(cat "$sf")
---

Then run: npm run build" "$VERIFY_TURNS" "$VERIFY_TIMEOUT" "$logf"
    fi
    
    # Second check: does build pass?
    if build_ok; then
        success "Build OK"
        return 0
    fi
    
    local err=$(get_errors)
    warn "Build failed, fixing..."
    
    run_claude "FIX:
$err

Tips: 'as any' for Supabase, check src/ paths.
npm run build after." "$VERIFY_TURNS" "$VERIFY_TIMEOUT" "$logf"
    
    build_ok
}

fix() {
    local part=$1 step=$2 attempt=$3
    local logf="$LOG_DIR/p${part}s${step}-fix${attempt}.log"
    local err=$(get_errors)
    
    warn "Fix #$attempt..."
    
    local prompt
    if same_error "$err"; then
        prompt="SAME ERROR - try different approach:
$err

Options: delete+recreate file, check all imports, use 'any' type."
    else
        save_error "$err"
        prompt="FIX:
$err"
    fi
    
    run_claude "$prompt

npm run build after." "$FIX_TURNS" "$FIX_TIMEOUT" "$logf"
    
    build_ok
}

#-------------------------------------------------------------------------------
# Git
#-------------------------------------------------------------------------------
commit_push() {
    git add -A
    git diff --cached --quiet && return 0
    git commit -m "$1"
    [[ -n "$GIT_REMOTE" ]] && git push "$GIT_REMOTE" "$GIT_BRANCH" 2>/dev/null || true
}

#-------------------------------------------------------------------------------
# Build Step
#-------------------------------------------------------------------------------
build_step() {
    local part=$1 step=$2
    local id="p${part}s${step}"
    
    is_done "$id" && { info "Already done"; return 0; }
    
    header "Part $part, Step $step"
    set_state current_part "$part"
    set_state current_step "$step"
    
    implement "$part" "$step"
    
    local try=0
    while ! verify "$part" "$step"; do
        ((try++))
        [[ $try -ge $MAX_RETRIES ]] && { error "Failed after $MAX_RETRIES tries"; return 1; }
        fix "$part" "$step" "$try"
    done
    
    commit_push "Part $part Step $step: $(step_title "$part" "$step")"
    add_completed "$id"
    rm -f "$LAST_ERROR_FILE"
    success "Done!"
}

#-------------------------------------------------------------------------------
# Build Part
#-------------------------------------------------------------------------------
build_part() {
    local part=$1
    local total=$(count_steps "$part")
    
    if [[ $total -eq 0 ]]; then
        error "No steps found for part '$part' (looking in $PLANS_DIR/haven-hub-plan-part${part}.md)"
        return 1
    fi
    
    header "Part $part ($total steps)"
    
    local start=1
    [[ "$(get_state current_part)" == "$part" ]] && start=$(get_state current_step)
    
    for ((s=start; s<=total; s++)); do
        build_step "$part" "$s" || return 1
    done
    
    jq ".completed_parts += [$part]" "$STATE_FILE" > tmp.$$ && mv tmp.$$ "$STATE_FILE"
    set_state current_step 1
    git tag -f "part-$part" 2>/dev/null; git push "$GIT_REMOTE" "part-$part" -f 2>/dev/null || true
    
    header "Part $part Complete! 🎉"
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------
main() {
    case "${1:-}" in
        --status) init_state; show_status; exit ;;
        --reset) rm -f "$STATE_FILE" "$LAST_ERROR_FILE"; rm -rf "$EXTRACTED_DIR"; echo "Reset"; exit ;;
        --preflight) preflight; exit ;;
        --verify) 
            shift
            init_state
            preflight || exit 1
            ensure_dirs
            if [[ $# -eq 0 ]]; then
                verify_all 1 2 3 4 5 6 7 8 9 10 11
            else
                verify_all "$@"
            fi
            exit 
            ;;
        --fix)
            shift
            init_state
            preflight || exit 1
            ensure_dirs
            if [[ $# -eq 0 ]]; then
                fix_missing 1 2 3 4 5 6 7 8 9 10 11
            else
                fix_missing "$@"
            fi
            exit
            ;;
        --resume) init_state; set -- $(seq "$(get_state current_part)" 11) ;;
        -h|--help) 
            echo "Usage: $0 [options] [parts...]"
            echo ""
            echo "Options:"
            echo "  --status     Show build progress"
            echo "  --reset      Clear state, start fresh"
            echo "  --resume     Continue from last position"  
            echo "  --verify     Check all work for accuracy (report only)"
            echo "  --fix        Find and fix missing files"
            echo "  --preflight  Check environment"
            exit 
            ;;
    esac
    
    init_state
    preflight || exit 1
    ensure_dirs
    [[ -d .git ]] || { git init; git add -A; git commit -m "Init" || true; }
    
    local parts
    if [[ $# -eq 0 ]]; then
        parts=(1 2 3 4 5 6 7 8 9 10 11)
    else
        parts=("$@")
    fi
    
    header "Haven Hub v2 Builder"
    echo "Parts: ${parts[*]}"
    
    for p in "${parts[@]}"; do
        jq -e ".completed_parts | index($p)" "$STATE_FILE" &>/dev/null && { info "Part $p done"; continue; }
        build_part "$p" || exit 1
    done
    
    header "🚀 Complete!"
    echo "Steps: $(jq '.completed_steps | length' "$STATE_FILE")"
}

#-------------------------------------------------------------------------------
# Fix Missing Files
#-------------------------------------------------------------------------------
fix_missing() {
    local fixed=0
    local failed=0
    
    header "Finding and Fixing Missing Files"
    
    for part in "$@"; do
        local steps=$(count_steps "$part")
        [[ $steps -eq 0 ]] && continue
        
        log "Part $part ($steps steps)"
        
        for ((step=1; step<=steps; step++)); do
            local sf=$(extract_step "$part" "$step") || continue
            local title=$(step_title "$part" "$step")
            local expected=$(get_expected_files "$sf")
            local missing=""
            
            for f in $expected; do
                [[ ! -f "$f" ]] && missing+="$f "
            done
            
            if [[ -n "$missing" ]]; then
                echo ""
                warn "Step $step: $title"
                echo "  Missing: $missing"
                info "Fixing..."
                
                local logf="$LOG_DIR/fix-p${part}s${step}-$(date +%H%M%S).log"
                
                run_claude "CREATE THESE MISSING FILES:
$missing

Use this step as reference:
---
$(cat "$sf")
---

PATHS: app/→src/app/ components/→src/components/ lib/→src/lib/ hooks/→src/hooks/ types/→src/types/

Create each file. Run 'npm run build' after." "$FIX_TURNS" "$FIX_TIMEOUT" "$logf"
                
                # Check if files were created
                local still_missing=""
                for f in $missing; do
                    [[ ! -f "$f" ]] && still_missing+="$f "
                done
                
                if [[ -z "$still_missing" ]]; then
                    success "Fixed Step $step"
                    ((fixed++))
                else
                    error "Still missing: $still_missing"
                    ((failed++))
                fi
            fi
        done
    done
    
    # Check build
    echo ""
    info "Checking build..."
    if build_ok; then
        success "Build passes"
    else
        warn "Build has errors:"
        get_errors | head -15
        echo ""
        info "Running build fix..."
        
        local logf="$LOG_DIR/fix-build-$(date +%H%M%S).log"
        run_claude "FIX BUILD ERRORS:
$(get_errors)

Use 'as any' for Supabase type errors.
Run 'npm run build' until it passes." "$FIX_TURNS" "$FIX_TIMEOUT" "$logf"
    fi
    
    # Commit if changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        git add -A
        git commit -m "Fix: repaired missing files"
        [[ -n "$GIT_REMOTE" ]] && git push "$GIT_REMOTE" "$GIT_BRANCH" || true
    fi
    
    # Summary
    header "Fix Summary"
    echo "Steps fixed: $fixed"
    echo "Steps failed: $failed"
    
    if build_ok; then
        success "Build passes!"
    else
        error "Build still failing - run ./orchestrate.sh --fix again or fix manually"
    fi
}

#-------------------------------------------------------------------------------
# Verify All (check existing work for accuracy)
#-------------------------------------------------------------------------------
verify_all() {
    local total_missing=0
    local total_files=0
    local issues=()
    
    header "Verifying Existing Work"
    
    for part in "$@"; do
        local steps=$(count_steps "$part")
        [[ $steps -eq 0 ]] && { warn "Part $part: no steps found"; continue; }
        
        echo ""
        log "Part $part ($steps steps)"
        
        for ((step=1; step<=steps; step++)); do
            local sf=$(extract_step "$part" "$step") || continue
            local title=$(step_title "$part" "$step")
            local expected=$(get_expected_files "$sf")
            local missing=""
            local found=0
            
            for f in $expected; do
                ((total_files++))
                if [[ -f "$f" ]]; then
                    ((found++))
                else
                    missing+=" $f"
                    ((total_missing++))
                fi
            done
            
            if [[ -z "$missing" ]]; then
                echo "  ✅ Step $step: $title ($found files)"
            else
                echo "  ❌ Step $step: $title (missing:$missing)"
                issues+=("Part $part Step $step:$missing")
            fi
        done
    done
    
    # Check build
    echo ""
    info "Checking build..."
    if build_ok; then
        success "Build passes"
    else
        error "Build fails"
        echo ""
        get_errors | head -20
    fi
    
    # Summary
    header "Verification Summary"
    echo "Total files checked: $total_files"
    echo "Missing files: $total_missing"
    echo ""
    
    if [[ ${#issues[@]} -eq 0 ]] && build_ok; then
        success "All files present and build passes!"
    else
        if [[ ${#issues[@]} -gt 0 ]]; then
            warn "Missing files:"
            for issue in "${issues[@]}"; do
                echo "  - $issue"
            done
        fi
        echo ""
        echo "To fix issues, run: ./orchestrate.sh"
    fi
}

main "$@"
