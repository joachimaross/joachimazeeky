#!/bin/bash

# 🌐 Zeeky AI Netlify Deployment Script
# Optimized deployment process for Netlify hosting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 Starting Zeeky AI Netlify Deployment...${NC}\n"

# Configuration
PROJECT_NAME="zeeky-ai"
NETLIFY_SITE_ID="${NETLIFY_SITE_ID:-}"
NETLIFY_AUTH_TOKEN="${NETLIFY_AUTH_TOKEN:-}"

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
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        print_error "Netlify CLI not found!"
        echo "Install with: npm install -g netlify-cli"
        echo "Then run: netlify login"
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
    
    # Check authentication
    if ! netlify status 2>/dev/null | grep -q "Logged in"; then
        print_error "Not logged in to Netlify!"
        echo "Run: netlify login"
        exit 1
    fi
    
    print_status "Prerequisites check completed"
}

# Function to validate environment
validate_environment() {
    echo -e "\n${BLUE}🔐 Validating environment...${NC}"
    
    # Check for .env files
    if [ ! -f ".env.netlify" ]; then
        print_warning ".env.netlify template not found"
        echo "Consider copying environment variables from .env.netlify to Netlify dashboard"
    else
        print_status "Environment template found"
    fi
    
    # Validate package.json
    if [ ! -f "package.json" ]; then
        print_error "package.json not found!"
        exit 1
    fi
    
    # Check for build script
    if ! grep -q '"build"' package.json; then
        print_error "Build script not found in package.json!"
        exit 1
    fi
    
    print_status "Environment validation completed"
}

# Function to run pre-deployment checks
pre_deployment_checks() {
    echo -e "\n${BLUE}🧪 Running pre-deployment checks...${NC}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm ci --prefer-offline
    fi
    
    # Run linting if available
    if npm run lint --silent 2>/dev/null; then
        print_status "Linting passed"
    else
        print_warning "Linting not available or failed"
    fi
    
    # Run tests if available
    if npm run test:ci --silent 2>/dev/null; then
        print_status "Tests passed"
    elif npm run test -- --passWithNoTests --watchAll=false 2>/dev/null; then
        print_status "Tests passed"
    else
        print_warning "Tests not available or failed"
    fi
    
    print_status "Pre-deployment checks completed"
}

# Function to optimize for Netlify
optimize_for_netlify() {
    echo -e "\n${BLUE}⚡ Optimizing for Netlify...${NC}"
    
    # Ensure netlify.toml exists
    if [ ! -f "netlify.toml" ]; then
        print_error "netlify.toml not found!"
        echo "This file is required for optimal Netlify deployment"
        exit 1
    fi
    
    # Ensure redirects file exists
    if [ ! -f "public/_redirects" ]; then
        print_warning "_redirects file not found in public/"
        echo "Creating basic SPA redirect..."
        echo "/*    /index.html   200" > public/_redirects
    fi
    
    # Ensure headers file exists
    if [ ! -f "public/_headers" ]; then
        print_warning "_headers file not found in public/"
    else
        print_status "Security headers configured"
    fi
    
    # Check for Netlify functions
    if [ -d "netlify/functions" ]; then
        print_status "Netlify functions detected"
    fi
    
    print_status "Netlify optimization completed"
}

# Function to build the application
build_application() {
    echo -e "\n${BLUE}🏗️ Building application...${NC}"
    
    # Clean previous build
    if [ -d "build" ]; then
        rm -rf build
    fi
    
    # Set production environment
    export NODE_ENV=production
    export CI=false
    
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
    
    # Check build size
    BUILD_SIZE=$(du -sh build/ | cut -f1)
    echo "📦 Build size: $BUILD_SIZE"
    
    # Copy Netlify-specific files if they don't exist in build
    if [ ! -f "build/_redirects" ] && [ -f "public/_redirects" ]; then
        cp public/_redirects build/_redirects
        print_status "Redirects file copied to build"
    fi
    
    if [ ! -f "build/_headers" ] && [ -f "public/_headers" ]; then
        cp public/_headers build/_headers
        print_status "Headers file copied to build"
    fi
    
    print_status "Application build completed"
}

# Function to run security checks
security_checks() {
    echo -e "\n${BLUE}🔒 Running security checks...${NC}"
    
    # Check for sensitive data in build
    if grep -r "sk-" build/ 2>/dev/null | head -5; then
        print_error "Potential API keys found in build!"
        echo "Please review and remove any exposed secrets"
        exit 1
    fi
    
    # Check for development URLs
    if grep -r "localhost" build/ 2>/dev/null | head -5; then
        print_warning "Localhost URLs found in build - verify they're intentional"
    fi
    
    # Check for console.log statements (in production builds, these should be minimal)
    LOG_COUNT=$(grep -r "console\.log" build/ 2>/dev/null | wc -l || echo "0")
    if [ "$LOG_COUNT" -gt 10 ]; then
        print_warning "Many console.log statements found ($LOG_COUNT) - consider removing for production"
    fi
    
    print_status "Security checks completed"
}

# Function to deploy to Netlify
deploy_to_netlify() {
    echo -e "\n${BLUE}🚀 Deploying to Netlify...${NC}"
    
    # Deploy to production
    if [ -n "$NETLIFY_SITE_ID" ]; then
        echo "Deploying to site: $NETLIFY_SITE_ID"
        netlify deploy --prod --dir=build --site=$NETLIFY_SITE_ID
    else
        echo "Deploying to linked site..."
        netlify deploy --prod --dir=build
    fi
    
    if [ $? -eq 0 ]; then
        print_status "Netlify deployment completed"
    else
        print_error "Netlify deployment failed!"
        exit 1
    fi
}

# Function to run post-deployment verification
post_deployment_verification() {
    echo -e "\n${BLUE}🏥 Running post-deployment verification...${NC}"
    
    # Get site URL
    SITE_URL=$(netlify status --json 2>/dev/null | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$SITE_URL" ]; then
        print_warning "Could not determine site URL"
        return
    fi
    
    echo "Verifying deployment at: $SITE_URL"
    
    # Wait for deployment to propagate
    sleep 5
    
    # Check if site is accessible
    if curl -s --head "$SITE_URL" | grep -q "200 OK"; then
        print_status "Site is accessible"
    else
        print_warning "Site may not be fully deployed yet"
    fi
    
    # Check health endpoint if it exists
    if curl -s "$SITE_URL/api/health" | grep -q "healthy\|warning"; then
        print_status "Health endpoint is working"
    else
        print_warning "Health endpoint not responding"
    fi
    
    # Check service worker
    if curl -s "$SITE_URL/sw.js" | grep -q "Zeeky\|workbox\|Cache"; then
        print_status "Service worker is deployed"
    else
        print_warning "Service worker may not be properly deployed"
    fi
    
    print_status "Post-deployment verification completed"
}

# Function to display deployment summary
deployment_summary() {
    echo -e "\n${GREEN}🎉 NETLIFY DEPLOYMENT COMPLETED! 🎉${NC}\n"
    
    # Get deployment info
    SITE_URL=$(netlify status --json 2>/dev/null | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    SITE_ID=$(netlify status --json 2>/dev/null | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 Live URL: $SITE_URL"
    echo "🆔 Site ID: $SITE_ID"
    echo "📦 Build Size: $(du -sh build/ 2>/dev/null | cut -f1 || echo 'Unknown')"
    echo "⏰ Deployment Time: $(date)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo -e "\n${BLUE}📋 Next Steps:${NC}"
    echo "1. Visit your live site: $SITE_URL"
    echo "2. Sign in with joachimaross@gmail.com to activate admin"
    echo "3. Test all functionality on the live site"
    echo "4. Monitor performance and error rates"
    echo "5. Configure custom domain if desired"
    
    echo -e "\n${BLUE}🔗 Useful Links:${NC}"
    echo "• Netlify Dashboard: https://app.netlify.com/sites/$SITE_ID"
    echo "• Domain Settings: https://app.netlify.com/sites/$SITE_ID/settings/domain"
    echo "• Environment Variables: https://app.netlify.com/sites/$SITE_ID/settings/env"
    echo "• Deploy Logs: https://app.netlify.com/sites/$SITE_ID/deploys"
}

# Main deployment process
main() {
    check_prerequisites
    validate_environment
    pre_deployment_checks
    optimize_for_netlify
    build_application
    security_checks
    deploy_to_netlify
    post_deployment_verification
    deployment_summary
    
    echo -e "\n${GREEN}✨ Zeeky AI is now live on Netlify! ✨${NC}"
}

# Handle script interruption
trap 'echo -e "\n${RED}⚠️ Deployment interrupted!${NC}"; exit 1' INT TERM

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi