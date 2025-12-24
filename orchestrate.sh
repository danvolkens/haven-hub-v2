#!/bin/bash
#===============================================================================
# Haven Hub v2 Automated Builder
#
# Repository: https://github.com/danvolkens/haven-hub-v2
# 
# Builds Haven Hub step-by-step using Claude Code with:
# - Implementation verification against plan
# - Automatic error recovery
# - Git commit and push after each step
# - Resume capability from failures
#
# Usage:
#   ./orchestrate.sh              # Build all parts (1-11)
#   ./orchestrate.sh 5 6 7        # Build specific parts
#   ./orchestrate.sh --resume     # Resume from last checkpoint
#   ./orchestrate.sh --status     # Show build status
#   ./orchestrate.sh --reset      # Reset build state
#===============================================================================

set -uo pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
PLANS_DIR="${PLANS_DIR:-./plans}"
LOG_DIR="${LOG_DIR:-./build-logs}"
STATE_FILE=".build-state.json"
MAX_RETRIES=3
STEP_TIMEOUT=900        # 15 minutes per step
VERIFY_TIMEOUT=300      # 5 minutes for verification
FIX_TIMEOUT=600         # 10 minutes for fixes

# GitHub Configuration
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GITHUB_REPO="https://github.com/danvolkens/haven-hub-v2"

#-------------------------------------------------------------------------------
# Colors and Logging
#-------------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

timestamp() { date +'%Y-%m-%d %H:%M:%S'; }
log()   { echo -e "${GREEN}[$(timestamp)]${NC} $1"; }
info()  { echo -e "${BLUE}[$(timestamp)]${NC} $1"; }
warn()  { echo -e "${YELLOW}[$(timestamp)]${NC} ⚠️  $1"; }
error() { echo -e "${RED}[$(timestamp)]${NC} ❌ $1"; }
success() { echo -e "${GREEN}[$(timestamp)]${NC} ✅ $1"; }

header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

#-------------------------------------------------------------------------------
# State Management
#-------------------------------------------------------------------------------
init_state() {
    if [[ ! -f "$STATE_FILE" ]]; then
        cat > "$STATE_FILE" << 'EOF'
{
    "started_at": null,
    "current_part": 1,
    "current_step": 1,
    "completed_parts": [],
    "completed_steps": [],
    "failed_attempts": [],
    "last_updated": null
}
EOF
    fi
}

get_state() {
    local key=$1
    jq -r ".$key" "$STATE_FILE"
}

set_state() {
    local key=$1
    local value=$2
    local tmp=$(mktemp)
    jq ".$key = $value | .last_updated = \"$(timestamp)\"" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

add_to_array() {
    local key=$1
    local value=$2
    local tmp=$(mktemp)
    jq ".$key += [$value]" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

is_step_completed() {
    local step_id=$1
    jq -e ".completed_steps | index(\"$step_id\")" "$STATE_FILE" > /dev/null 2>&1
}

show_status() {
    header "Build Status"
    if [[ -f "$STATE_FILE" ]]; then
        echo -e "${BOLD}Current State:${NC}"
        echo "  Part: $(get_state 'current_part')"
        echo "  Step: $(get_state 'current_step')"
        echo ""
        echo -e "${BOLD}Completed Parts:${NC}"
        jq -r '.completed_parts | if length == 0 then "  None" else .[] | "  ✅ Part \(.)" end' "$STATE_FILE"
        echo ""
        echo -e "${BOLD}Completed Steps:${NC} $(jq '.completed_steps | length' "$STATE_FILE")"
        echo ""
        echo -e "${BOLD}Failed Attempts:${NC}"
        jq -r '.failed_attempts | if length == 0 then "  None" else .[-5:][] end' "$STATE_FILE"
    else
        echo "No build state found. Run ./orchestrate.sh to start."
    fi
}

reset_state() {
    warn "Resetting build state..."
    rm -f "$STATE_FILE"
    init_state
    success "Build state reset"
}

#-------------------------------------------------------------------------------
# Plan Parsing
#-------------------------------------------------------------------------------
count_steps() {
    local part=$1
    local plan_file="$PLANS_DIR/haven-hub-plan-part${part}.md"
    
    if [[ ! -f "$plan_file" ]]; then
        echo "0"
        return
    fi
    
    grep -c "^## Step" "$plan_file" || echo "0"
}

get_step_title() {
    local part=$1
    local step=$2
    local plan_file="$PLANS_DIR/haven-hub-plan-part${part}.md"
    
    grep "^## Step" "$plan_file" | sed -n "${step}p" | sed 's/^## Step [0-9.]*: //'
}

#-------------------------------------------------------------------------------
# Build Functions
#-------------------------------------------------------------------------------
run_claude() {
    local prompt=$1
    local max_turns=${2:-25}
    local timeout_secs=${3:-$STEP_TIMEOUT}
    local log_file=${4:-"/dev/null"}
    
    timeout "$timeout_secs" claude -p "$prompt" \
        --allowedTools "Bash,Read,Write,Edit" \
        --max-turns "$max_turns" 2>&1 | tee -a "$log_file"
    
    return ${PIPESTATUS[0]}
}

verify_build() {
    log "Verifying build..."
    if npm run build > /dev/null 2>&1; then
        success "Build passed"
        return 0
    else
        error "Build failed"
        return 1
    fi
}

run_migrations() {
    if ls supabase/migrations/*.sql 1> /dev/null 2>&1; then
        log "Running migrations..."
        npx supabase db push 2>&1 || warn "Migration push had issues (may be okay)"
    fi
}

git_commit_and_push() {
    local message=$1
    
    log "Committing: $message"
    git add -A
    
    if git diff --cached --quiet; then
        info "No changes to commit"
        return 0
    fi
    
    git commit -m "$message"
    
    if [[ -n "$GIT_REMOTE" ]]; then
        log "Pushing to $GIT_REMOTE/$GIT_BRANCH..."
        if git push "$GIT_REMOTE" "$GIT_BRANCH" 2>&1; then
            success "Pushed successfully"
        else
            warn "Push failed (will retry later)"
        fi
    fi
}

#-------------------------------------------------------------------------------
# Implementation Step
#-------------------------------------------------------------------------------
implement_step() {
    local part=$1
    local step=$2
    local plan_file="$PLANS_DIR/haven-hub-plan-part${part}.md"
    local step_title=$(get_step_title "$part" "$step")
    local log_file="$LOG_DIR/part${part}-step${step}-$(date +%Y%m%d-%H%M%S).log"
    
    log "Implementing: Part $part, Step $step - $step_title"
    
    local prompt="You are building Haven Hub v2 step by step.

READ the plan file: $plan_file

IMPLEMENT ONLY Step $step (find the ${step}th '## Step' heading in the file).

CRITICAL - src/ DIRECTORY MAPPING:
The plans were written without src/ prefix. You MUST add it:
- app/ in plans → create in src/app/
- components/ in plans → create in src/components/
- lib/ in plans → create in src/lib/
- hooks/ in plans → create in src/hooks/
- types/ in plans → create in src/types/

These stay at root (NO src/ prefix):
- trigger/ → trigger/
- supabase/migrations/ → supabase/migrations/

REQUIREMENTS:
1. Create ALL files shown in that step with the src/ prefix for app code
2. Use the exact code from the plan - do not modify or 'improve' it
3. After creating migration files, run: npx supabase db push
4. After all files are created, run: npm run build
5. If the build fails, fix the errors until it passes

DO NOT:
- Skip any files mentioned in the step
- Implement steps other than Step $step
- Forget the src/ prefix for app code
- Modify code from what the plan specifies

When complete, the build must pass with 'npm run build'."

    if ! run_claude "$prompt" 30 "$STEP_TIMEOUT" "$log_file"; then
        warn "Claude exited with non-zero status"
    fi
    
    return 0
}

#-------------------------------------------------------------------------------
# Verification Step
#-------------------------------------------------------------------------------
verify_step() {
    local part=$1
    local step=$2
    local plan_file="$PLANS_DIR/haven-hub-plan-part${part}.md"
    local log_file="$LOG_DIR/part${part}-step${step}-verify.log"
    
    log "Verifying implementation accuracy..."
    
    local prompt="You just implemented Step $step from $plan_file.

VERIFY your work by checking:

1. READ the plan file again and find Step $step
2. LIST all files that should have been created in that step
3. REMEMBER the src/ mapping:
   - app/ in plans → should be in src/app/
   - components/ in plans → should be in src/components/
   - lib/ in plans → should be in src/lib/
   - hooks/ in plans → should be in src/hooks/
   - types/ in plans → should be in src/types/
4. CHECK each file exists in the CORRECT location and contains the correct code:
   - Use 'cat <filename>' to read each file
   - Compare against what the plan specifies
5. RUN 'npm run build' to verify the build passes

If ANY files are missing, in wrong location, or incorrect:
- Create or fix them to match the plan (with src/ prefix)
- Run 'npm run build' again

If ANY migrations were added:
- Run 'npx supabase db push'

Report what you verified and any fixes made."

    run_claude "$prompt" 20 "$VERIFY_TIMEOUT" "$log_file"
    
    # Final build check
    verify_build
}

#-------------------------------------------------------------------------------
# Fix Step
#-------------------------------------------------------------------------------
fix_step() {
    local part=$1
    local step=$2
    local attempt=$3
    local plan_file="$PLANS_DIR/haven-hub-plan-part${part}.md"
    local log_file="$LOG_DIR/part${part}-step${step}-fix${attempt}.log"
    
    warn "Fix attempt $attempt for Part $part Step $step"
    
    local prompt="The build is failing for Step $step from $plan_file.

DEBUG AND FIX:

1. Run 'npm run build' and READ the error messages carefully
2. Identify what's wrong (missing imports, typos, missing files, wrong paths, etc.)
3. REMEMBER: All app code should be in src/
   - app/ → src/app/
   - components/ → src/components/
   - lib/ → src/lib/
   - hooks/ → src/hooks/
   - types/ → src/types/
4. Fix each issue:
   - If a file is missing, create it from the plan (in src/)
   - If code is wrong, fix it to match the plan
   - If imports are missing, add them
   - If paths are wrong, correct them
5. Run 'npm run build' again
6. Repeat until the build passes

Also check:
- All files from Step $step exist in correct locations
- Migration files have been pushed with 'npx supabase db push'

The build MUST pass before you finish."

    run_claude "$prompt" 15 "$FIX_TIMEOUT" "$log_file"
    
    verify_build
}

#-------------------------------------------------------------------------------
# Main Build Step Orchestration
#-------------------------------------------------------------------------------
build_step() {
    local part=$1
    local step=$2
    local step_id="part${part}-step${step}"
    local step_title=$(get_step_title "$part" "$step")
    
    # Check if already completed
    if is_step_completed "$step_id"; then
        info "Step $step already completed, skipping"
        return 0
    fi
    
    header "Part $part, Step $step: $step_title"
    
    # Update state
    set_state "current_part" "$part"
    set_state "current_step" "$step"
    
    # Phase 1: Implement
    implement_step "$part" "$step"
    
    # Phase 2: Verify and fix if needed
    local attempt=0
    while ! verify_step "$part" "$step"; do
        ((attempt++))
        
        if [[ $attempt -ge $MAX_RETRIES ]]; then
            error "Failed after $MAX_RETRIES attempts"
            add_to_array "failed_attempts" "\"$step_id at $(timestamp)\""
            return 1
        fi
        
        fix_step "$part" "$step" "$attempt"
    done
    
    # Phase 3: Commit and push
    git_commit_and_push "Part $part Step $step: $step_title"
    
    # Mark complete
    add_to_array "completed_steps" "\"$step_id\""
    
    success "Part $part Step $step complete!"
    return 0
}

#-------------------------------------------------------------------------------
# Build Part
#-------------------------------------------------------------------------------
build_part() {
    local part=$1
    local plan_file="$PLANS_DIR/haven-hub-plan-part${part}.md"
    
    if [[ ! -f "$plan_file" ]]; then
        error "Plan file not found: $plan_file"
        return 1
    fi
    
    local total_steps=$(count_steps "$part")
    
    if [[ $total_steps -eq 0 ]]; then
        error "No steps found in $plan_file"
        return 1
    fi
    
    header "Building Part $part ($total_steps steps)"
    
    # Determine starting step
    local start_step=1
    local current_part=$(get_state "current_part")
    local current_step=$(get_state "current_step")
    
    if [[ "$current_part" == "$part" && $current_step -gt 1 ]]; then
        start_step=$current_step
        info "Resuming from step $start_step"
    fi
    
    # Build each step
    for ((step=start_step; step<=total_steps; step++)); do
        if ! build_step "$part" "$step"; then
            error "Build failed at Part $part Step $step"
            echo ""
            echo "To resume: ./orchestrate.sh --resume"
            echo "To retry this part: ./orchestrate.sh $part"
            return 1
        fi
    done
    
    # Mark part complete
    add_to_array "completed_parts" "$part"
    set_state "current_step" "1"
    
    # Tag in git
    git tag -f "part-${part}-complete" 2>/dev/null || true
    if [[ -n "$GIT_REMOTE" ]]; then
        git push "$GIT_REMOTE" "part-${part}-complete" -f 2>/dev/null || true
    fi
    
    header "Part $part Complete! 🎉"
    return 0
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------
main() {
    # Setup
    mkdir -p "$LOG_DIR"
    init_state
    
    # Parse arguments
    case "${1:-}" in
        --status)
            show_status
            exit 0
            ;;
        --reset)
            reset_state
            exit 0
            ;;
        --resume)
            local current_part=$(get_state "current_part")
            info "Resuming from Part $current_part"
            shift
            set -- $(seq "$current_part" 11)
            ;;
        --help|-h)
            echo "Usage: $0 [options] [part numbers...]"
            echo ""
            echo "Options:"
            echo "  --status   Show build status"
            echo "  --resume   Resume from last checkpoint"
            echo "  --reset    Reset build state"
            echo "  --help     Show this help"
            echo ""
            echo "Examples:"
            echo "  $0              Build all parts (1-11)"
            echo "  $0 5 6 7        Build specific parts"
            echo "  $0 --resume     Resume after failure"
            exit 0
            ;;
    esac
    
    # Determine which parts to build
    local parts=()
    if [[ $# -eq 0 ]]; then
        parts=(1 2 3 4 5 6 7 8 9 10 11)
    else
        parts=("$@")
    fi
    
    # Record start time
    if [[ "$(get_state 'started_at')" == "null" ]]; then
        set_state "started_at" "\"$(timestamp)\""
    fi
    
    header "Haven Hub Automated Builder"
    echo "Parts to build: ${parts[*]}"
    echo "Plans directory: $PLANS_DIR"
    echo "Log directory: $LOG_DIR"
    echo ""
    
    # Verify prerequisites
    if ! command -v claude &> /dev/null; then
        error "Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm not found"
        exit 1
    fi
    
    if [[ ! -d ".git" ]]; then
        warn "Not a git repository. Initializing..."
        git init
        git add -A
        git commit -m "Initial commit" || true
    fi
    
    # Build each part
    local failed=0
    for part in "${parts[@]}"; do
        # Check if already completed
        if jq -e ".completed_parts | index($part)" "$STATE_FILE" > /dev/null 2>&1; then
            info "Part $part already completed, skipping"
            continue
        fi
        
        if ! build_part "$part"; then
            failed=1
            break
        fi
    done
    
    # Final summary
    echo ""
    if [[ $failed -eq 0 ]]; then
        header "🚀 Build Complete!"
        echo "All requested parts have been built successfully."
        echo ""
        echo "Completed parts: $(jq -r '.completed_parts | join(", ")' "$STATE_FILE")"
        echo "Total steps: $(jq '.completed_steps | length' "$STATE_FILE")"
    else
        header "Build Incomplete"
        echo "The build stopped due to errors."
        echo ""
        echo "To resume: ./orchestrate.sh --resume"
        echo "To check status: ./orchestrate.sh --status"
        echo "Logs are in: $LOG_DIR"
    fi
}

main "$@"
