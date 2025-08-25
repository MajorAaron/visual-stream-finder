#!/bin/bash

# Setup local secrets for Supabase Edge Functions
# This script helps configure your local development environment

PROJECT_REF="mrkcgfsbdcukufgwvjap"
ENV_FILE="supabase/functions/.env"

echo "🔐 Setting up local secrets for Supabase Edge Functions"
echo ""
echo "You need to get the following secrets from your Supabase Dashboard:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/vault"
echo ""
echo "Required secrets:"
echo "  1. OPENAI_API_KEY"
echo "  2. TMDB_API_KEY"
echo "  3. YOUTUBE_API_KEY"
echo ""
echo "The other secrets (FIRECRAWL_API_KEY and STREAMING_AVAILABILITY_API_KEY) are already configured."
echo ""

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating new .env file..."
    cat > "$ENV_FILE" << 'EOF'
# Environment variables for local edge function development
# Copy these values from your Supabase dashboard

# Required for search-content function
TMDB_API_KEY=your_tmdb_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
FIRECRAWL_API_KEY=fc-44ed69ef26fc4680a099995ca2c4b77c
STREAMING_AVAILABILITY_API_KEY=ce60f1a86bmshd4fe91f2ed5c2ffp1d72b8jsn3e0ee0d6e66e

# Required for analyze-image function
# OPENAI_API_KEY is already defined above
YOUTUBE_API_KEY=your_youtube_api_key_here
EOF
    echo "✅ Created $ENV_FILE"
else
    echo "✅ Using existing $ENV_FILE"
fi

echo ""
echo "Next steps:"
echo "1. Open https://supabase.com/dashboard/project/$PROJECT_REF/settings/vault"
echo "2. Copy the secret values"
echo "3. Edit $ENV_FILE and replace the placeholder values"
echo "4. Restart Edge Functions: npx supabase functions serve --env-file $ENV_FILE"