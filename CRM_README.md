# CRM Pro - Sales Tracker Application

A modern, full-featured Customer Relationship Management (CRM) and Sales Tracker web application built with Next.js, React, Tailwind CSS, and shadcn/ui components.

## 🚀 Features

### Core Functionality

#### 1. **Authentication & User Management**
- Email/password authentication system
- Role-based access control (Admin and Sales roles)
- Protected routes based on user roles
- User profile management

#### 2. **Dashboard**
- Real-time metrics and KPIs
- Conversion rate tracking
- Monthly target progress
- Team attendance summary
- Overdue follow-up alerts
- Interactive charts and visualizations

#### 3. **Lead Management**
- Create, view, and edit sales leads
- Track lead sources and status
- Convert qualified leads to opportunities
- Filter and search capabilities
- Lead assignment to sales team members

#### 4. **Company Management**
- Comprehensive company profiles
- Regional organization
- Contact management within companies
- Company type classification (Private/Government/Mixed)
- Opportunity tracking per company

#### 5. **Sales Pipeline (Opportunities)**
- **Dual View Modes:**
  - Kanban board for visual pipeline management
  - Table view for detailed data analysis
- Drag-and-drop stage progression (in Kanban view)
- Deal value and probability tracking
- Follow-up date management
- Overdue opportunity alerts
- Pipeline metrics and weighted forecasting

#### 6. **Daily Attendance System**
- Mandatory daily check-in for sales team
- Visit report submission
- Photo upload capability
- Google Timeline integration
- Attendance compliance tracking

#### 7. **Attendance Log (Admin Only)**
- Team attendance monitoring
- Historical attendance records
- Missing attendance alerts
- Bulk reminder system
- Export capabilities

#### 8. **Sales Forecasts (Admin Only)**
- Regional target setting
- Monthly and yearly planning
- Achievement tracking
- Year-to-date performance analysis
- Performance status indicators

## 🎨 Design Features

- **Modern UI/UX**: Clean, professional interface with intuitive navigation
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices
- **Dark Mode Support**: Built-in dark theme support
- **Interactive Elements**: Smooth animations and transitions
- **Visual Indicators**: Color-coded status badges and progress bars
- **Data Visualization**: Charts and graphs for quick insights

## 🛠️ Technology Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui
- **Icons**: Lucide React
- **Language**: TypeScript
- **State Management**: React Hooks

## 📁 Project Structure

```
src/
├── app/
│   ├── login/              # Authentication pages
│   ├── signup/
│   ├── dashboard/          # Main dashboard
│   ├── leads/              # Lead management
│   ├── companies/          # Company management
│   ├── opportunities/      # Sales pipeline
│   ├── attendance/         # Daily attendance
│   ├── attendance-log/     # Admin attendance view
│   └── forecasts/          # Sales forecasting
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── nav/                # Navigation components
│   └── layouts/            # Layout wrappers
└── lib/                    # Utilities and helpers
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CRM
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
# Add any required environment variables here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

You will be redirected to the login page.

### Build for Production

```bash
npm run build
npm start
```

## 📱 Application Flow

1. **Initial Access**: Users land on the home page and are redirected to login
2. **Authentication**: Users log in with email and password
3. **Dashboard**: After login, users see their personalized dashboard
4. **Navigation**: Role-based navigation shows relevant pages
5. **Daily Workflow**:
   - Sales team submits daily attendance
   - Manages leads and opportunities
   - Updates pipeline progress
6. **Admin Functions**:
   - Monitor team attendance
   - Set regional targets
   - View comprehensive reports

## 👥 User Roles

### Sales Role
- Access to personal leads and opportunities
- Submit daily attendance
- View personal dashboard metrics
- Manage assigned companies and contacts

### Admin Role
- All sales role permissions
- View team-wide data
- Access attendance logs
- Manage forecasts and targets
- Send bulk reminders

## 🎯 Key Pages Overview

### Login (`/login`)
- Clean, centered login form
- Email and password authentication
- Link to signup page

### Dashboard (`/dashboard`)
- Key metrics cards
- Lead source breakdown
- Pipeline visualization
- Attendance status
- Overdue alerts

### Leads (`/leads`)
- Comprehensive lead table
- Add/Edit lead functionality
- Status management
- Lead-to-opportunity conversion

### Opportunities (`/opportunities`)
- Kanban and table views
- Pipeline stage management
- Deal tracking
- Follow-up scheduling

### Attendance (`/attendance`)
- Daily report form
- Photo upload
- Timeline link submission
- Submission confirmation

## 🔒 Security Features

- Protected routes
- Role-based access control
- Form validation
- Secure authentication flow

## 📊 Mock Data

The application currently uses mock data for demonstration purposes. In production, this would be replaced with:
- Supabase backend integration
- PostgreSQL database
- Real-time data synchronization
- API endpoints for CRUD operations

## 🚀 Next Steps for Production

1. **Backend Integration**:
   - Set up Supabase project
   - Implement database schema
   - Connect authentication
   - Set up real-time subscriptions

2. **Email Notifications**:
   - Configure email service (Resend/SendGrid)
   - Implement reminder system
   - Set up automated notifications

3. **Storage**:
   - Configure file upload for photos
   - Set up cloud storage bucket

4. **Deployment**:
   - Deploy to Vercel/Netlify
   - Set up environment variables
   - Configure domain and SSL

## 📝 License

This project is proprietary and confidential.

## 🤝 Support

For support and questions, please contact the development team.

---

Built with ❤️ using Next.js and modern web technologies

## 🔔 Push Notifications

This app supports browser push notifications via a Service Worker (`public/sw.js`) and VAPID keys.

- Generate keys (dev helper): call `POST /api/notifications/generate-keys` and copy the values.
- Set `.env`:
  - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must equal `VAPID_PUBLIC_KEY`
- The client fetches the configured key from `/api/notifications/public-key` if needed.
- Restart the dev server after updating env.
