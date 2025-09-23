# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Project Setup
```bash
# Install dependencies
npm install

# Generate Prisma client (required after schema changes)
npx prisma generate

# Setup environment variables
cp .env.example .env.local  # Then edit .env.local with your values
```

### Development
```bash
# Start development server with Turbopack (faster builds)
npm run dev

# Start regular development server
next dev

# Run linter
npm run lint

# Run database migrations (development)
npx prisma migrate dev

# View database in Prisma Studio
npx prisma studio

# Test database connection
node scripts/test-db-connection.js

# Run API tests
node scripts/test-leads-api.js
node scripts/test-members-api.js
node scripts/test-analytics.js
```

### Production Deployment
```bash
# Build for production
npm run build

# Start production server
npm run start

# Deploy using the deployment script
bash scripts/deploy.sh

# Run production migrations safely
npx prisma migrate deploy
```

### Database Operations
```bash
# Create a new migration
npx prisma migrate dev --name <migration_name>

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Check database schema status
node scripts/check-db-schema.js

# Seed database with test data
npx prisma db seed
```

### Testing Specific Features
```bash
# Test export functionality
node test-export.js

# Test reports with authentication
node test-reports-with-auth.js

# Test opportunity updates
node test-opportunity-update.js

# Test pipeline relationships
node test-pipeline-relationship.js

# Test pending quotations
node test-pending-quotations.js
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15.2.3 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with jose library, stored in HTTP-only cookies
- **Charts**: Recharts, ApexCharts, Chart.js
- **File Handling**: xlsx for exports, sharp for images, puppeteer for PDF generation
- **Push Notifications**: Web Push with Service Worker

### Project Structure

```
/src
├── /app                    # Next.js App Router pages and API routes
│   ├── /api               # API endpoints organized by resource
│   │   ├── /leads        # Lead management endpoints
│   │   ├── /companies    # Company management
│   │   ├── /opportunities # Sales pipeline endpoints
│   │   ├── /attendance   # Attendance tracking
│   │   └── /notifications # Push notification endpoints
│   ├── /(auth)           # Authentication pages (login, signup)
│   └── /(main)           # Protected pages requiring authentication
├── /components           # React components
│   ├── /ui              # shadcn/ui base components
│   ├── /nav             # Navigation components (CRMNav)
│   ├── /forms           # Form components (DailyFollowUpForm)
│   └── /dashboard       # Dashboard views (GraphicalView, StatisticalView)
├── /lib                 # Shared utilities
│   └── prisma.ts       # Prisma client initialization
└── middleware.ts       # JWT authentication middleware
```

### Core Architecture Patterns

#### 1. Authentication Flow
- JWT tokens stored in HTTP-only cookies for security
- Middleware (`src/middleware.ts`) validates tokens on every request
- Protected routes redirect to `/login` if unauthorized
- Role-based access control (admin vs sales roles)

#### 2. Data Access Layer
- All database operations go through Prisma ORM
- API routes handle business logic and access control
- Companies have regional organization with owner assignments
- Leads can be converted to Opportunities with stage progression

#### 3. Key Data Relationships
```
Users (employees) ─┬─> Leads ──> Opportunities ──> Pipelines
                   ├─> Companies ─┬─> Contacts
                   └─> Attendance └─> Opportunities
                   
Daily Follow-ups can link to: Leads, Opportunities, Companies, Contacts
Activities track all interactions across entities
```

#### 4. API Pattern
All API routes follow a consistent pattern:
1. Extract JWT from cookie
2. Verify user authentication
3. Apply role-based access control
4. Execute business logic with Prisma
5. Return JSON response with appropriate status

Example API structure:
```typescript
// GET /api/[resource] - List with filtering
// POST /api/[resource] - Create new
// GET /api/[resource]/[id] - Get single
// PUT /api/[resource]/[id] - Update
// DELETE /api/[resource]/[id] - Delete
```

#### 5. Real-time Features
- Push notifications via Service Worker (`public/sw.js`)
- VAPID keys for browser push subscriptions
- Attendance reminders and follow-up notifications
- Dashboard auto-refresh for real-time metrics

### Key Business Flows

#### Lead to Opportunity Conversion
1. Lead created with qualification scoring
2. Lead qualified through stages (COLD → WARM → HOT → QUALIFIED)
3. Convert endpoint transforms lead to opportunity
4. Opportunity moves through pipeline stages
5. Track with activities and follow-ups

#### Daily Attendance System
1. Sales team submits daily attendance with visit report
2. Photo upload and Google Timeline URL submission
3. Admin reviews and approves attendance
4. Missing attendance triggers reminder notifications
5. Compliance tracking in dashboard

#### Sales Pipeline Management
1. Opportunities progress through stages (PROSPECTING → QUALIFICATION → PROPOSAL → NEGOTIATION → CLOSED_WON/LOST)
2. Each stage has probability and velocity tracking
3. Weighted forecasting based on deal size and probability
4. Automated follow-up scheduling
5. Risk assessment and bottleneck detection

### Environment Variables

Required environment variables for local development:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/crm_db"

# Authentication
JWT_SECRET="your-secret-key-here"

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Push Notifications (optional)
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="same-as-VAPID_PUBLIC_KEY"

# Email (optional)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-password"
```

### Performance Considerations

1. **Database Indexing**: Key fields are indexed for query performance
   - userId + date combinations for attendance
   - companyId, leadId for relationships
   - followUpDate for scheduling queries

2. **Data Fetching**: 
   - Use Prisma's `select` to limit fields returned
   - Include related data judiciously to avoid N+1 queries
   - Implement pagination for large datasets

3. **Frontend Optimization**:
   - Next.js Turbopack for faster development builds
   - SWR for client-side data caching
   - Lazy loading for heavy components

### Security Considerations

1. **Authentication**: JWT tokens in HTTP-only cookies
2. **Authorization**: Role-based access control at API level
3. **Input Validation**: Zod schemas for request validation
4. **SQL Injection**: Protected via Prisma's parameterized queries
5. **XSS Protection**: React's built-in escaping
6. **CORS**: Configured in Next.js for API routes

### Common Debugging Commands

```bash
# Check current database schema
npx prisma db pull

# Validate Prisma schema
npx prisma validate

# Format Prisma schema
npx prisma format

# Debug API endpoints
curl -X GET http://localhost:3000/api/leads \
  -H "Cookie: token=your-jwt-token"

# Check production build locally
npm run build && npm run start
```