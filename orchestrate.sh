#!/bin/bash
#===============================================================================
# Haven Hub v2 Automated Builder - Optimized
#
# Key optimizations:
# 1. Extracts just the relevant step from plan (saves context/turns)
# 2. Pre-checks for existing files
# 3. Passes build errors directly to fix prompts
# 4. Shorter, more directive prompts
# 5. Better state tracking within steps
#===============================================================================

set -uo pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
PLANS_DIR="${PLANS_DIR:-./plans}"
LOG_DIR="${LOG_DIR:-./build-logs}"
STATE_FILE=".build-state.json"
EXTRACTED_DIR=".extracted-steps"

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
# Colors and Logging
#-------------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

timestamp() { date +'%Y-%m-%d %H:%M:%S'; }
log()     { echo -e "${GREEN}[$(timestamp)]${NC} $1"; }
info()    { echo -e "${BLUE}[$(timestamp)]${NC} $1"; }
warn()    { echo -e "${YELLOW}[$(timestamp)]${NC} ⚠️  $1"; }
error()   { echo -e "${RED}[$(timestamp)]${NC} ❌ $1"; }
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
        echo '{"started_at":null,"current_part":1,"current_step":1,"completed_parts":[],"completed_steps":[],"failed_attempts":[],"last_updated":null}' > "$STATE_FILE"
    fi
    mkdir -p "$EXTRACTED_DIR" "$LOG_DIR"
}

get_state() {
    jq -r ".$1" "$STATE_FILE"
}

set_state() {
    local tmp=$(mktemp)
    jq ".$1 = $2 | .last_updated = \"$(timestamp)\"" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

add_to_array() {
    local tmp=$(mktemp)
    jq ".$1 += [$2]" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

is_step_completed() {
    jq -e ".completed_steps | index(\"$1\")" "$STATE_FILE" > /dev/null 2>&1
}

show_status() {
    header "Build Status"
    echo "Current: Part $(get_state 'current_part'), Step $(get_state 'current_step')"
    echo "Completed steps: $(jq '.completed_steps | length' "$STATE_FILE")"
    echo "Completed parts: $(jq -r '.completed_parts | join(", ")' "$STATE_FILE")"
}

#-------------------------------------------------------------------------------
# Step Extraction (KEY OPTIMIZATION)
#-------------------------------------------------------------------------------
extract_step() {
    local part=$1
    local step=$2
    local plan_file="$PLANS_DIR/haven-hub-plan-part${part}.md"
    local output_file="$EXTRACTED_DIR/part${part}-step${step}.md"
    
    if [[ ! -f "$plan_file" ]]; then
        error "Plan file not found: $plan_file"
        return 1
    fi
    
    # Extract just this step using awk
    awk -v step="$step" '
        /^## Step/ { count++; if (count == step) found=1; else if (found) exit }
        found { print }
    ' "$plan_file" > "$output_file"
    
    if [[ ! -s "$output_file" ]]; then
        error "Could not extract step $step from $plan_file"
        return 1
    fi
    
    echo "$output_file"
}

get_step_title() {
    local part=$1
    local step=$2
    local plan_file="$PLANS_DIR/haven-hub-plan-part${part}.md"
    grep "^## Step" "$plan_file" | sed -n "${step}p" | sed 's/^## Step [0-9.]*: //'
}

count_steps() {
    local part=$1
    local plan_file="$PLANS_DIR/haven-hub-plan-part${part}.md"
    [[ -f "$plan_file" ]] && grep -c "^## Step" "$plan_file" || echo "0"
}

#-------------------------------------------------------------------------------
# Build Helpers
#-------------------------------------------------------------------------------
verify_build() {
    npm run build 2>&1
}

get_build_errors() {
    npm run build 2>&1 | grep -A3 "error\|Error" | head -30
}

run_migrations() {
    if ls supabase/migrations/*.sql 1> /dev/null 2>&1; then
        npx supabase db push 2>&1 || true
    fi
}

#-------------------------------------------------------------------------------
# Claude Runner (Optimized)
#-------------------------------------------------------------------------------
run_claude() {
    local prompt="$1"
    local max_turns=${2:-50}
    local timeout_secs=${3:-600}
    local log_file="${4:-/dev/null}"
    
    # Write prompt to file
    local prompt_file=$(mktemp)
    printf '%s' "$prompt" > "$prompt_file"
    
    # Create wrapper
    local wrapper=$(mktemp)
    cat > "$wrapper" << EOF
#!/bin/bash
exec claude -p "\$(cat '$prompt_file')" --allowedTools Bash,Read,Write,Edit --max-turns $max_turns
EOF
    chmod +x "$wrapper"
    
    # Run
    if [[ "$OSTYPE" == "darwin"* ]] && command -v gtimeout &> /dev/null; then
        gtimeout "$timeout_secs" "$wrapper" 2>&1 | tee -a "$log_file"
    elif [[ "$OSTYPE" != "darwin"* ]]; then
        timeout "$timeout_secs" "$wrapper" 2>&1 | tee -a "$log_file"
    else
        "$wrapper" 2>&1 | tee -a "$log_file"
    fi
    
    local exit_code=$?
    rm -f "$prompt_file" "$wrapper"
    sleep 1
    return $exit_code
}

#-------------------------------------------------------------------------------
# Implementation (Optimized)
#-------------------------------------------------------------------------------
implement_step() {
    local part=$1
    local step=$2
    local step_title=$(get_step_title "$part" "$step")
    local log_file="$LOG_DIR/part${part}-step${step}-impl-$(date +%Y%m%d-%H%M%S).log"
    
    log "Implementing: Part $part, Step $step - $step_title"
    
    # Extract just this step (saves tokens!)
    local step_file
    step_file=$(extract_step "$part" "$step")
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    info "Step extracted to: $step_file"
    info "Running Claude (max $IMPLEMENT_TURNS turns)..."
    
    # Concise, action-oriented prompt
    local prompt="IMPLEMENT this step. The step content is below.

PATH RULES:
- app/ → src/app/
- components/ → src/components/  
- lib/ → src/lib/
- hooks/ → src/hooks/
- types/ → src/types/
- trigger/ and supabase/ stay at root

ACTIONS:
1. Create each file shown below
2. Run: npx supabase db push (if migrations)
3. Run: npm run build
4. Fix errors (use 'as any' for Supabase type issues)
5. Repeat until build passes

--- STEP CONTENT ---
$(cat "$step_file")
--- END ---

START NOW. Create the files."

    run_claude "$prompt" "$IMPLEMENT_TURNS" "$STEP_TIMEOUT" "$log_file"
    info "Implementation complete"
}

#-------------------------------------------------------------------------------
# Verification (Optimized)
#-------------------------------------------------------------------------------
verify_step() {
    local part=$1
    local step=$2
    local log_file="$LOG_DIR/part${part}-step${step}-verify-$(date +%Y%m%d-%H%M%S).log"
    
    info "Verifying step..."
    
    # Check build first
    if npm run build > /dev/null 2>&1; then
        success "Build passes"
        return 0
    fi
    
    # Get specific errors
    local errors
    errors=$(get_build_errors)
    
    warn "Build failed, running verification..."
    
    local step_file="$EXTRACTED_DIR/part${part}-step${step}.md"
    
    local prompt="BUILD FAILED. Fix these errors:

$errors

Check files exist in src/ and fix any issues.
Use 'as any' for Supabase type errors.
Run 'npm run build' until it passes."

    run_claude "$prompt" "$VERIFY_TURNS" "$VERIFY_TIMEOUT" "$log_file"
    
    # Check again
    npm run build > /dev/null 2>&1
}

#-------------------------------------------------------------------------------
# Fix Step (Optimized)  
#-------------------------------------------------------------------------------
fix_step() {
    local part=$1
    local step=$2
    local attempt=$3
    local log_file="$LOG_DIR/part${part}-step${step}-fix${attempt}-$(date +%Y%m%d-%H%M%S).log"
    
    warn "Fix attempt $attempt..."
    
    local errors
    errors=$(get_build_errors)
    
    local prompt="FIX THESE BUILD ERRORS (attempt $attempt):

$errors

Common fixes:
- Missing import → add it
- Type error on Supabase table → use 'as any'
- Wrong path → files are in src/
- Missing file → create it

Run 'npm run build' after each fix."

    run_claude "$prompt" "$FIX_TURNS" "$FIX_TIMEOUT" "$log_file"
    
    npm run build > /dev/null 2>&1
}

#-------------------------------------------------------------------------------
# Git Operations
#-------------------------------------------------------------------------------
git_commit_and_push() {
    local message=$1
    
    git add -A
    if git diff --cached --quiet; then
        info "No changes to commit"
        return 0
    fi
    
    git commit -m "$message"
    
    if [[ -n "$GIT_REMOTE" ]]; then
        git push "$GIT_REMOTE" "$GIT_BRANCH" 2>&1 || warn "Push failed"
    fi
}

#-------------------------------------------------------------------------------
# Build Step (Main Loop)
#-------------------------------------------------------------------------------
build_step() {
    local part=$1
    local step=$2
    local step_id="part${part}-step${step}"
    local step_title=$(get_step_title "$part" "$step")
    
    if is_step_completed "$step_id"; then
        info "Step already complete, skipping"
        return 0
    fi
    
    header "Part $part, Step $step: $step_title"
    
    set_state "current_part" "$part"
    set_state "current_step" "$step"
    
    # Implement
    implement_step "$part" "$step"
    
    # Verify (with retries)
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
    
    # Commit
    git_commit_and_push "Part $part Step $step: $step_title"
    
    # Mark complete
    add_to_array "completed_steps" "\"$step_id\""
    success "Step complete!"
    return 0
}

#-------------------------------------------------------------------------------
# Build Part
#-------------------------------------------------------------------------------
build_part() {
    local part=$1
    local total_steps=$(count_steps "$part")
    
    if [[ $total_steps -eq 0 ]]; then
        error "No steps found for part $part"
        return 1
    fi
    
    header "Building Part $part ($total_steps steps)"
    
    local start_step=1
    if [[ "$(get_state 'current_part')" == "$part" ]]; then
        start_step=$(get_state 'current_step')
    fi
    
    for ((step=start_step; step<=total_steps; step++)); do
        if ! build_step "$part" "$step"; then
            error "Failed at Part $part Step $step"
            echo "Resume with: ./orchestrate.sh --resume"
            return 1
        fi
    done
    
    add_to_array "completed_parts" "$part"
    set_state "current_step" "1"
    git tag -f "part-${part}-complete" 2>/dev/null || true
    
    header "Part $part Complete! 🎉"
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------
main() {
    init_state
    
    case "${1:-}" in
        --status) show_status; exit 0 ;;
        --reset) rm -f "$STATE_FILE"; rm -rf "$EXTRACTED_DIR"; init_state; echo "Reset"; exit 0 ;;
        --resume)
            shift
            set -- $(seq "$(get_state 'current_part')" 11)
            ;;
        --help|-h)
            echo "Usage: $0 [--status|--reset|--resume] [parts...]"
            exit 0
            ;;
    esac
    
    local parts=("${@:-1 2 3 4 5 6 7 8 9 10 11}")
    
    header "Haven Hub v2 Builder (Optimized)"
    echo "Parts: ${parts[*]}"
    
    # Prerequisites
    command -v claude &> /dev/null || { error "Claude CLI not found"; exit 1; }
    command -v npm &> /dev/null || { error "npm not found"; exit 1; }
    
    if [[ "$OSTYPE" == "darwin"* ]] && ! command -v gtimeout &> /dev/null; then
        warn "Install gtimeout for timeouts: brew install coreutils"
    fi
    
    [[ -d ".git" ]] || { git init; git add -A; git commit -m "Initial" || true; }
    
    # Build
    for part in ${parts[@]}; do
        if jq -e ".completed_parts | index($part)" "$STATE_FILE" > /dev/null 2>&1; then
            info "Part $part already complete"
            continue
        fi
        build_part "$part" || exit 1
    done
    
    header "🚀 Build Complete!"
    echo "Completed: $(jq -r '.completed_parts | join(", ")' "$STATE_FILE")"
}

main "$@"
