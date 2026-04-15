#!/bin/sh

# Railway provides DATABASE_URL as postgres:// but Prisma needs postgresql://
if [ -n "$DATABASE_URL" ]; then
  export DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/^postgres:/postgresql:/')
  echo "Database URL detected"

  echo "Running database migrations..."
  if node_modules/.bin/prisma migrate deploy 2>&1; then
    echo "Migrations completed successfully"
  else
    echo "Warning: Migrations failed, but continuing with startup"
  fi
else
  echo "Warning: DATABASE_URL not set, skipping migrations"
fi

echo "Starting server..."
exec node server.js
