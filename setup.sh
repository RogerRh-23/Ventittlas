#!/bin/bash

# Setup script for Ventittlas project

echo "🚀 Setting up Ventittlas project..."

# Check if .env exists
if [ ! -f "php/.env" ]; then
    echo "📋 Creating .env file from template..."
    cp php/.env.example php/.env
    echo "✅ .env file created!"
    echo "⚠️  Please edit php/.env with your actual credentials:"
    echo "   - Database connection details"  
    echo "   - Gemini API key"
    echo ""
    echo "📝 Edit with: nano php/.env"
else
    echo "✅ .env file already exists"
fi

# Check for required packages
echo "🔍 Checking system requirements..."

# Check PHP
if command -v php &> /dev/null; then
    echo "✅ PHP is installed: $(php --version | head -n1)"
else
    echo "❌ PHP not found. Install with: sudo apt install php php-mysql php-curl"
fi

# Check MySQL
if command -v mysql &> /dev/null; then
    echo "✅ MySQL client is available"
else
    echo "⚠️  MySQL client not found. Install with: sudo apt install mysql-client"
fi

echo ""
echo "🎉 Setup complete!"
echo "📖 Next steps:"
echo "   1. Edit php/.env with your credentials"
echo "   2. Set up your web server (Apache/Nginx)"
echo "   3. Test the application"