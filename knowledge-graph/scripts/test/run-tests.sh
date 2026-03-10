#!/bin/bash

# Test Runner Script for Knowledge Base Application
# This script provides a comprehensive test execution environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$TEST_DIR")")"
LOG_DIR="$TEST_DIR/logs"
REPORTS_DIR="$TEST_DIR/reports"

# Create necessary directories
mkdir -p "$LOG_DIR" "$REPORTS_DIR"

# Load environment variables
if [ -f "$TEST_DIR/.env.test" ]; then
    export $(cat "$TEST_DIR/.env.test" | grep -v '^#' | xargs)
fi

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Python (for backend tests)
    if ! command -v python3 &> /dev/null; then
        log_warning "Python3 is not installed, backend tests will be skipped"
    fi
    
    # Check if dependencies are installed
    if [ ! -d "$TEST_DIR/node_modules" ]; then
        log_info "Installing npm dependencies..."
        cd "$TEST_DIR"
        npm install
    fi
    
    log_success "Dependencies check completed"
}

setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Create test directories
    mkdir -p "$TEST_DIR/test-uploads"
    mkdir -p "$TEST_DIR/screenshots"
    mkdir -p "$TEST_DIR/videos"
    mkdir -p "$TEST_DIR/traces"
    
    # Install Playwright browsers if needed
    if [ ! -d "$HOME/.cache/ms-playwright" ]; then
        log_info "Installing Playwright browsers..."
        cd "$TEST_DIR"
        npx playwright install
    fi
    
    log_success "Test environment setup completed"
}

run_unit_tests() {
    log_info "Running unit tests..."
    
    cd "$TEST_DIR"
    
    # Frontend unit tests
    if [ "$1" = "frontend" ] || [ "$1" = "all" ] || [ -z "$1" ]; then
        log_info "Running frontend unit tests..."
        npm run test:unit:frontend 2>&1 | tee "$LOG_DIR/unit-frontend.log"
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            log_success "Frontend unit tests passed"
        else
            log_error "Frontend unit tests failed"
            return 1
        fi
    fi
    
    # Backend unit tests
    if [ "$1" = "backend" ] || [ "$1" = "all" ] || [ -z "$1" ]; then
        if command -v python3 &> /dev/null; then
            log_info "Running backend unit tests..."
            npm run test:unit:backend 2>&1 | tee "$LOG_DIR/unit-backend.log"
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                log_success "Backend unit tests passed"
            else
                log_error "Backend unit tests failed"
                return 1
            fi
        else
            log_warning "Skipping backend unit tests (Python3 not available)"
        fi
    fi
    
    log_success "Unit tests completed"
}

run_integration_tests() {
    log_info "Running integration tests..."
    
    cd "$TEST_DIR"
    
    # Check if services are running
    check_services
    
    npm run test:integration 2>&1 | tee "$LOG_DIR/integration.log"
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log_success "Integration tests passed"
    else
        log_error "Integration tests failed"
        return 1
    fi
}

run_e2e_tests() {
    log_info "Running E2E tests..."
    
    cd "$TEST_DIR"
    
    # Check if frontend and backend are running
    check_services
    
    npm run test:e2e 2>&1 | tee "$LOG_DIR/e2e.log"
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log_success "E2E tests passed"
    else
        log_error "E2E tests failed"
        return 1
    fi
}

check_services() {
    log_info "Checking required services..."
    
    # Check frontend service
    if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
        log_warning "Frontend service not running at $BASE_URL"
        log_info "You may need to start the frontend service manually"
    else
        log_success "Frontend service is running"
    fi
    
    # Check backend API
    if ! curl -s "$API_BASE_URL/health" > /dev/null 2>&1; then
        log_warning "Backend API not running at $API_BASE_URL"
        log_info "You may need to start the backend service manually"
    else
        log_success "Backend API is running"
    fi
}

generate_reports() {
    log_info "Generating test reports..."
    
    cd "$TEST_DIR"
    
    # Generate coverage report
    if [ -d "coverage" ]; then
        log_info "Coverage report available at: $TEST_DIR/coverage/index.html"
    fi
    
    # Generate Playwright report
    if [ -d "playwright-report" ]; then
        log_info "Playwright report available at: $TEST_DIR/playwright-report/index.html"
    fi
    
    # Generate consolidated report
    cat > "$REPORTS_DIR/test-summary.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Test Summary Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .warning { background: #fff3cd; border-color: #ffeaa7; }
        .error { background: #f8d7da; border-color: #f5c6cb; }
        .log-link { display: inline-block; margin: 5px; padding: 5px 10px; background: #007bff; color: white; text-decoration: none; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Knowledge Base Application - Test Summary</h1>
        <p>Generated on: $(date)</p>
    </div>
    
    <div class="section">
        <h2>Test Execution Summary</h2>
        <p>Test execution completed. Check individual log files for detailed results.</p>
    </div>
    
    <div class="section">
        <h2>Available Reports</h2>
        <a href="../coverage/index.html" class="log-link">Coverage Report</a>
        <a href="../playwright-report/index.html" class="log-link">E2E Test Report</a>
        <a href="../logs/unit-frontend.log" class="log-link">Frontend Unit Tests</a>
        <a href="../logs/unit-backend.log" class="log-link">Backend Unit Tests</a>
        <a href="../logs/integration.log" class="log-link">Integration Tests</a>
        <a href="../logs/e2e.log" class="log-link">E2E Tests</a>
    </div>
</body>
</html>
EOF
    
    log_success "Test reports generated at: $REPORTS_DIR/test-summary.html"
}

cleanup() {
    log_info "Cleaning up test artifacts..."
    
    # Clean old screenshots and videos (keep last 10)
    if [ -d "$TEST_DIR/screenshots" ]; then
        find "$TEST_DIR/screenshots" -name "*.png" -type f | sort -r | tail -n +11 | xargs rm -f
    fi
    
    if [ -d "$TEST_DIR/videos" ]; then
        find "$TEST_DIR/videos" -name "*.webm" -type f | sort -r | tail -n +11 | xargs rm -f
    fi
    
    # Clean old logs (keep last 5)
    if [ -d "$LOG_DIR" ]; then
        find "$LOG_DIR" -name "*.log" -type f -mtime +5 -delete
    fi
    
    log_success "Cleanup completed"
}

show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  unit [frontend|backend|all]  Run unit tests"
    echo "  integration                  Run integration tests"
    echo "  e2e                         Run E2E tests"
    echo "  all                         Run all tests"
    echo "  setup                       Setup test environment"
    echo "  cleanup                     Clean up test artifacts"
    echo "  check                       Check dependencies and services"
    echo "  help                        Show this help message"
    echo ""
    echo "Options:"
    echo "  --verbose                   Enable verbose output"
    echo "  --no-cleanup               Skip cleanup after tests"
    echo "  --headless                  Run E2E tests in headless mode"
    echo "  --debug                     Enable debug mode"
    echo ""
    echo "Examples:"
    echo "  $0 unit frontend            Run only frontend unit tests"
    echo "  $0 all --verbose            Run all tests with verbose output"
    echo "  $0 e2e --headless           Run E2E tests in headless mode"
}

# Main execution
main() {
    local command="${1:-all}"
    local test_type="${2:-all}"
    local cleanup_after=true
    local verbose=false
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                verbose=true
                shift
                ;;
            --no-cleanup)
                cleanup_after=false
                shift
                ;;
            --headless)
                export HEADLESS=true
                shift
                ;;
            --debug)
                set -x
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # Set verbose mode
    if [ "$verbose" = true ]; then
        set -v
    fi
    
    case $command in
        "setup")
            check_dependencies
            setup_test_environment
            ;;
        "unit")
            check_dependencies
            setup_test_environment
            run_unit_tests "$test_type"
            ;;
        "integration")
            check_dependencies
            setup_test_environment
            run_integration_tests
            ;;
        "e2e")
            check_dependencies
            setup_test_environment
            run_e2e_tests
            ;;
        "all")
            check_dependencies
            setup_test_environment
            run_unit_tests "all"
            run_integration_tests
            run_e2e_tests
            generate_reports
            ;;
        "check")
            check_dependencies
            check_services
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
    
    # Cleanup if requested
    if [ "$cleanup_after" = true ] && [ "$command" != "cleanup" ] && [ "$command" != "help" ] && [ "$command" != "check" ]; then
        cleanup
    fi
    
    log_success "Test execution completed successfully!"
}

# Run main function with all arguments
main "$@"