# Golf Course Timesheets

A web application for managing golf course employee timesheets, built with Next.js, PostgreSQL, and Prisma. Designed for deployment on Railway.

## Features

- Admin-only access with simple password authentication
- Bi-weekly pay periods (March - December 2026)
- Clock in/out time entry with automatic hour calculation
- ADMIN manual hour entries
- Ontario stat holiday pay calculation (Total Hours / 20 per ESA)
- Excel export per pay period
- Employee management (add, deactivate, delete)
- Dashboard with summary statistics

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL with Prisma ORM
- ExcelJS for spreadsheet export
- JWT authentication

## Deploy to Railway

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/golf-timesheets.git
git push -u origin main
```

### 2. Set up Railway

1. Go to [railway.com](https://railway.com) and create a new project
2. Click "New Service" > "GitHub Repo" and select your repository
3. Add a PostgreSQL database: click "New Service" > "Database" > "PostgreSQL"
4. Railway will auto-detect the Dockerfile

### 3. Environment Variables

In Railway, set these environment variables on your web service:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-set if you link the Railway Postgres service |
| `ADMIN_PASSWORD` | Password for admin login | `your-secure-password` |
| `JWT_SECRET` | Secret for JWT tokens | `a-long-random-string` |

**Important:** Link the Railway PostgreSQL service to your web service so `DATABASE_URL` is set automatically.

### 4. First Run

After deployment:
1. Visit your Railway URL
2. Log in with your admin password
3. The app will automatically seed pay periods and stat holidays on first dashboard load
4. Add employees via the Employees page
5. Start entering time entries

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your local PostgreSQL connection string

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start dev server
npm run dev
```

## Ontario Stat Holidays (2026)

The app includes auto-calculation for these statutory holidays:
- Good Friday (April 3)
- Victoria Day (May 18)
- Canada Day (July 1)
- Labour Day (September 7)
- Thanksgiving (October 12)
- Christmas Day (December 25)
- Boxing Day (December 26)

Stat pay is calculated as: Total Hours in Prior 4-Week Window / 20
