#!/bin/bash

# Script to pull schema from Supabase production database
# This will introspect your production database and generate the TypeScript schema

echo "🔍 Pulling schema from Supabase production database..."
echo ""
echo "⚠️  Make sure you have your DATABASE_URL set with your Supabase password!"
echo ""
echo "Your DATABASE_URL should look like:"
echo "postgresql://postgres.wszmunacylavwkyquxnh:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set!"
    echo ""
    echo "Please run this script with DATABASE_URL set:"
    echo "  DATABASE_URL='your-connection-string' pnpm db:pull"
    echo ""
    echo "Or add it to your .env.local file and run:"
    echo "  source .env.local && pnpm db:pull"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo "🔄 Running drizzle-kit introspect..."
echo ""

pnpm drizzle-kit introspect:pg

echo ""
echo "✅ Done! Check src/db/schema.ts for the generated schema"
