#!/bin/bash

# ==============================================
# ZEEKY AI - DEPLOYMENT SCRIPT
# ==============================================
# This script handles the complete deployment process
# for Zeeky AI to various hosting platforms

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}=============================================="
    echo -e "🤖 ZEEKY AI DEPLOYMENT SCRIPT"
    echo -e "=============================================="
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}➤ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_requirements() {
    print_step "Checking requirements..."
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ and try again."
        exit 1
    fi
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 16+ and try again."
        exit 1
    fi
    
    print_step "✅ Requirements check passed"
}

check_env_file() {
    print_step "Checking environment configuration..."
    
    if [ ! -f ".env" ]; then
        print_warning "No .env file found!"
        echo "Please create a .env file based on .env.example"
        echo "You can copy the example file:"
        echo "  cp .env.example .env"
        echo ""
        echo "Then edit .env with your actual API keys and configuration."
        exit 1
    fi
    
    # Check for required environment variables
    REQUIRED_VARS=(
        "REACT_APP_FIREBASE_API_KEY"
        "REACT_APP_FIREBASE_AUTH_DOMAIN"
        "REACT_APP_FIREBASE_PROJECT_ID"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=your_" .env; then
            print_error "Environment variable $var is not set or still contains placeholder value"
            print_warning "Please update your .env file with actual values"
            exit 1
        fi
    done
    
    print_step "✅ Environment configuration validated"
}

install_dependencies() {
    print_step "Installing dependencies..."
    
    # Clear npm cache
    npm cache clean --force
    
    # Install dependencies
    npm install
    
    print_step "✅ Dependencies installed"
}

run_tests() {
    print_step "Running tests..."
    
    # Run tests if they exist
    if [ -f "src/App.test.js" ]; then
        npm test -- --coverage --watchAll=false
    else
        print_warning "No tests found, skipping test phase"
    fi
    
    print_step "✅ Tests completed"
}

build_production() {
    print_step "Building production bundle..."
    
    # Set production environment
    export NODE_ENV=production
    
    # Build the application
    npm run build
    
    # Check if build was successful
    if [ ! -d "build" ]; then
        print_error "Build failed! build directory not found."
        exit 1
    fi
    
    print_step "✅ Production build completed"
    
    # Show build statistics
    echo ""
    echo "📊 Build Statistics:"
    echo "Build folder size: $(du -sh build | cut -f1)"
    echo "Number of files: $(find build -type f | wc -l)"
    echo ""
}

deploy_to_netlify() {
    print_step "Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    
    # Deploy to Netlify
    netlify deploy --prod --dir=build
    
    print_step "✅ Deployed to Netlify"
}

deploy_to_vercel() {
    print_step "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy to Vercel
    vercel --prod
    
    print_step "✅ Deployed to Vercel"
}

deploy_to_firebase() {
    print_step "Deploying to Firebase Hosting..."
    
    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI not found. Installing..."
        npm install -g firebase-tools
    fi
    
    # Initialize Firebase if not already done
    if [ ! -f "firebase.json" ]; then
        print_step "Initializing Firebase..."
        firebase init hosting
    fi
    
    # Deploy to Firebase
    firebase deploy --only hosting
    
    print_step "✅ Deployed to Firebase Hosting"
}

show_deployment_options() {
    echo ""
    echo "🚀 Choose deployment platform:"
    echo "1) Netlify (Recommended)"
    echo "2) Vercel"
    echo "3) Firebase Hosting"
    echo "4) Build only (no deployment)"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_to_netlify
            ;;
        2)
            deploy_to_vercel
            ;;
        3)
            deploy_to_firebase
            ;;
        4)
            print_step "Build completed. You can manually deploy the 'build' folder to your hosting provider."
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
}

cleanup() {
    print_step "Cleaning up temporary files..."
    
    # Remove node_modules if specified
    if [ "$1" = "--clean" ]; then
        rm -rf node_modules
        print_step "✅ node_modules removed"
    fi
}

# Main deployment process
main() {
    print_header
    
    # Parse command line arguments
    CLEAN=false
    PLATFORM=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                CLEAN=true
                shift
                ;;
            --platform=*)
                PLATFORM="${1#*=}"
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --clean          Remove node_modules after deployment"
                echo "  --platform=PLATFORM  Deploy to specific platform (netlify, vercel, firebase)"
                echo "  -h, --help       Show this help message"
                echo ""
                echo "Platforms:"
                echo "  netlify         Deploy to Netlify"
                echo "  vercel          Deploy to Vercel"
                echo "  firebase        Deploy to Firebase Hosting"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_requirements
    check_env_file
    install_dependencies
    run_tests
    build_production
    
    # Deploy based on platform choice
    if [ -n "$PLATFORM" ]; then
        case $PLATFORM in
            netlify)
                deploy_to_netlify
                ;;
            vercel)
                deploy_to_vercel
                ;;
            firebase)
                deploy_to_firebase
                ;;
            *)
                print_error "Unknown platform: $PLATFORM"
                exit 1
                ;;
        esac
    else
        show_deployment_options
    fi
    
    # Cleanup if requested
    if [ "$CLEAN" = true ]; then
        cleanup --clean
    fi
    
    echo ""
    print_step "🎉 Zeeky AI deployment completed successfully!"
    echo ""
    echo "🤖 Your advanced AI assistant is now live!"
    echo "📱 Make sure to test all features:"
    echo "   • Voice recognition and synthesis"
    echo "   • Avatar animations and emotions"
    echo "   • AI chat with multiple personas"
    echo "   • Music generation capabilities"
    echo "   • Business CRM functionality"
    echo ""
    echo "🔧 Next steps:"
    echo "   • Configure your custom domain"
    echo "   • Set up SSL certificates"
    echo "   • Configure monitoring and analytics"
    echo "   • Test on multiple devices"
    echo ""
}

# Run main function with all arguments
main "$@"