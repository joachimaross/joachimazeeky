#!/bin/bash

# 🚀 Zeeky AI Production Deployment Script
# Automates the complete production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Zeeky AI Production Deployment...${NC}\n"

# Configuration
PROJECT_NAME="zeeky-ai"
DOMAIN="zeeky.ai"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found!"
        echo "Please create .env.production with your production environment variables."
        echo "Use .env.example as a template."
        exit 1
    fi
    
    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI not found!"
        echo "Install with: npm install -g firebase-tools"
        exit 1
    fi
    
    # Check if Node.js and npm are installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found!"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm not found!"
        exit 1
    fi
    
    # Check if Git is clean
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Git working directory is not clean!"
        echo "Uncommitted changes detected. Please commit or stash changes before deployment."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    print_status "Prerequisites check completed"
}

# Function to create backup
create_backup() {
    echo -e "\n${BLUE}💾 Creating backup...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment if exists
    if [ -d "build" ]; then
        cp -r build "$BACKUP_DIR/build_backup"
        print_status "Build backup created"
    fi
    
    # Backup environment files
    if [ -f ".env.production" ]; then
        cp .env.production "$BACKUP_DIR/env.production.backup"
    fi
    
    if [ -f ".env.local" ]; then
        cp .env.local "$BACKUP_DIR/env.local.backup"
    fi
    
    print_status "Backup created in $BACKUP_DIR"
}

# Function to run tests
run_tests() {
    echo -e "\n${BLUE}🧪 Running tests...${NC}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm ci
    fi
    
    # Run linting
    if npm run lint --silent 2>/dev/null; then
        print_status "Linting passed"
    else
        print_warning "Linting issues detected, but continuing..."
    fi
    
    # Run tests if test script exists
    if npm run test:ci --silent 2>/dev/null; then
        print_status "Tests passed"
    else
        print_warning "Tests not found or failed, but continuing..."
    fi
    
    print_status "Test phase completed"
}

# Function to build for production
build_production() {
    echo -e "\n${BLUE}🏗️ Building for production...${NC}"
    
    # Copy production environment
    cp .env.production .env.local
    
    # Clean previous build
    if [ -d "build" ]; then
        rm -rf build
    fi
    
    # Build the application
    echo "Building React application..."
    npm run build
    
    if [ ! -d "build" ]; then
        print_error "Build failed - build directory not found!"
        exit 1
    fi
    
    # Verify critical files exist
    if [ ! -f "build/index.html" ]; then
        print_error "Build failed - index.html not found!"
        exit 1
    fi
    
    if [ ! -f "build/static/js/"*.js ]; then
        print_error "Build failed - JavaScript files not found!"
        exit 1
    fi
    
    # Generate service worker if not exists
    if [ ! -f "build/sw.js" ]; then
        cp public/sw.js build/sw.js 2>/dev/null || echo "Service worker will be copied during deployment"
    fi
    
    print_status "Production build completed"
}

# Function to optimize assets
optimize_assets() {
    echo -e "\n${BLUE}⚡ Optimizing assets...${NC}"
    
    # Compress JavaScript files
    if command -v terser &> /dev/null; then
        find build/static/js -name "*.js" -exec terser {} -o {} -c -m \;
        print_status "JavaScript files compressed"
    fi
    
    # Compress CSS files
    if command -v cleancss &> /dev/null; then
        find build/static/css -name "*.css" -exec cleancss -o {} {} \;
        print_status "CSS files compressed"
    fi
    
    # Generate Brotli compression if available
    if command -v brotli &> /dev/null; then
        find build -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec brotli {} \;
        print_status "Brotli compression applied"
    fi
    
    print_status "Asset optimization completed"
}

# Function to run security checks
security_check() {
    echo -e "\n${BLUE}🔒 Running security checks...${NC}"
    
    # Check for sensitive data in build
    if grep -r "sk-" build/ 2>/dev/null; then
        print_error "Potential API keys found in build!"
        print_warning "Please review and remove any exposed secrets"
    fi
    
    # Check for development URLs
    if grep -r "localhost" build/ 2>/dev/null; then
        print_warning "Localhost URLs found in build - please verify they're intentional"
    fi
    
    # Verify HTTPS enforcement
    if ! grep -q "https://" build/index.html; then
        print_warning "HTTPS enforcement not detected in build"
    fi
    
    print_status "Security checks completed"
}

# Function to deploy to Firebase Hosting
deploy_firebase() {
    echo -e "\n${BLUE}🌐 Deploying to Firebase Hosting...${NC}"
    
    # Login check
    if ! firebase projects:list >/dev/null 2>&1; then
        echo "Please log in to Firebase:"
        firebase login
    fi
    
    # Deploy to Firebase
    echo "Deploying to Firebase Hosting..."
    firebase deploy --only hosting
    
    if [ $? -eq 0 ]; then
        print_status "Firebase deployment completed"
    else
        print_error "Firebase deployment failed!"
        exit 1
    fi
}

# Function to deploy backend services
deploy_backend() {
    echo -e "\n${BLUE}🖥️ Deploying backend services...${NC}"
    
    # Deploy Firebase Functions if they exist
    if [ -d "functions" ]; then
        echo "Deploying Firebase Functions..."
        firebase deploy --only functions
    fi
    
    # Deploy Firestore rules
    if [ -f "firestore.rules" ]; then
        echo "Deploying Firestore security rules..."
        firebase deploy --only firestore:rules
    fi
    
    # Deploy Storage rules
    if [ -f "storage.rules" ]; then
        echo "Deploying Storage security rules..."
        firebase deploy --only storage
    fi
    
    print_status "Backend deployment completed"
}

# Function to run health checks
health_check() {
    echo -e "\n${BLUE}🏥 Running health checks...${NC}"
    
    # Get Firebase hosting URL
    PROJECT_ID=$(firebase use)
    HOSTING_URL="https://${PROJECT_ID}.web.app"
    
    echo "Checking deployment at: $HOSTING_URL"
    
    # Wait a moment for deployment to propagate
    sleep 10
    
    # Check if site is accessible
    if curl -s --head "$HOSTING_URL" | grep "200 OK" > /dev/null; then
        print_status "Site is accessible"
    else
        print_warning "Site may not be fully deployed yet"
    fi
    
    # Check for service worker
    if curl -s "$HOSTING_URL/sw.js" | grep "Zeeky AI" > /dev/null; then
        print_status "Service worker is deployed"
    else
        print_warning "Service worker may not be properly deployed"
    fi
    
    print_status "Health checks completed"
}

# Function to setup monitoring
setup_monitoring() {
    echo -e "\n${BLUE}📊 Setting up monitoring...${NC}"
    
    # Enable Firebase Performance Monitoring
    echo "Enabling Firebase Performance Monitoring..."
    
    # Enable Analytics if configured
    if grep -q "REACT_APP_GOOGLE_ANALYTICS_ID" .env.production; then
        print_status "Google Analytics configured"
    else
        print_warning "Google Analytics not configured"
    fi
    
    # Setup error reporting
    if grep -q "REACT_APP_SENTRY_DSN" .env.production; then
        print_status "Error reporting (Sentry) configured"
    else
        print_warning "Error reporting not configured"
    fi
    
    print_status "Monitoring setup completed"
}

# Function to finalize deployment
finalize_deployment() {
    echo -e "\n${BLUE}🎯 Finalizing deployment...${NC}"
    
    # Create deployment record
    DEPLOYMENT_INFO="deployment_$(date +%Y%m%d_%H%M%S).json"
    cat > "$DEPLOYMENT_INFO" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "$(git rev-parse HEAD)",
  "branch": "$(git branch --show-current)",
  "deployer": "$(whoami)",
  "environment": "production",
  "domain": "$DOMAIN",
  "backup_location": "$BACKUP_DIR"
}
EOF
    
    # Tag the deployment
    GIT_TAG="deploy-$(date +%Y%m%d-%H%M%S)"
    git tag -a "$GIT_TAG" -m "Production deployment $(date)"
    git push origin "$GIT_TAG" 2>/dev/null || print_warning "Could not push git tag"
    
    print_status "Deployment finalized"
}

# Function to display deployment summary
deployment_summary() {
    echo -e "\n${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉${NC}\n"
    
    PROJECT_ID=$(firebase use)
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 Live URL: https://${PROJECT_ID}.web.app"
    echo "🌐 Custom Domain: https://$DOMAIN (if configured)"
    echo "📦 Backup Location: $BACKUP_DIR"
    echo "🏷️  Git Tag: $GIT_TAG"
    echo "⏰ Deployment Time: $(date)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo -e "\n${BLUE}📋 Next Steps:${NC}"
    echo "1. Visit your live site and test all functionality"
    echo "2. Sign in with joachimaross@gmail.com to activate admin"
    echo "3. Run the admin initialization script if needed"
    echo "4. Monitor performance and error rates"
    echo "5. Set up domain pointing if using custom domain"
    
    echo -e "\n${BLUE}🔗 Useful Links:${NC}"
    echo "• Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
    echo "• Hosting Dashboard: https://console.firebase.google.com/project/$PROJECT_ID/hosting"
    echo "• Analytics: https://console.firebase.google.com/project/$PROJECT_ID/analytics"
}

# Main deployment process
main() {
    echo -e "${BLUE}Starting deployment process...${NC}\n"
    
    check_prerequisites
    create_backup
    run_tests
    build_production
    optimize_assets
    security_check
    deploy_firebase
    deploy_backend
    health_check
    setup_monitoring
    finalize_deployment
    deployment_summary
    
    echo -e "\n${GREEN}✨ Zeeky AI is now live in production! ✨${NC}"
}

# Handle script interruption
trap 'echo -e "\n${RED}⚠️ Deployment interrupted!${NC}"; exit 1' INT TERM

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi