#!/bin/bash

# Script to apply avatar storage policies to production Supabase
# You'll need to get your database password from Supabase dashboard

echo "🔐 Applying avatar storage policies to production Supabase..."
echo ""
echo "To get your database password:"
echo "1. Go to https://supabase.com/dashboard/project/mrkcgfsbdcukufgwvjap/settings/database"
echo "2. Find 'Database password' section"
echo "3. Click 'Reset database password' if you don't know it"
echo ""
read -p "Enter your database password: " -s DB_PASSWORD
echo ""

# Database connection details
DB_HOST="aws-0-us-west-1.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.mrkcgfsbdcukufgwvjap"

# Apply the migration
psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  -f supabase/migrations/20250825000001_avatar_bucket_policies.sql

if [ $? -eq 0 ]; then
  echo "✅ Policies applied successfully!"
else
  echo "❌ Failed to apply policies"
  exit 1
fi