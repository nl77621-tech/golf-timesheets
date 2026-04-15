#!/bin/sh
set -e

# Railway provides DATABASE_URL as postgres:// but Prisma needs postgresql://
if [ -n "$DATABASE_URL" ]; then
  export DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/^postgres:/postgresql:/')
fi

echo "Running database migrations..."
node_modules/.bin/prisma migrate deploy

echo "Starting server..."
exec node server.js
