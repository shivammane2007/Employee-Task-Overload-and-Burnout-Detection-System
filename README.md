# SEAPM - Employee Task Overload and Burnout Detection System

A comprehensive web application for monitoring employee workload, detecting burnout risks, and optimizing task distribution for better team performance.

## 🌟 Features

### For Employees
- **Personal Dashboard**: View your current workload score, task breakdown, and trends
- **Task Management**: Track, update, and complete assigned tasks
- **Workload Analysis**: Understand your workload components and burnout risk
- **Alerts & Notifications**: Receive proactive alerts about high workload or approaching deadlines

### For Managers
- **Team Overview**: Monitor all team members' workload at a glance
- **Risk Detection**: Identify employees at high burnout risk
- **Task Assignment**: Create and assign tasks to team members
- **Team Reports**: View detailed analytics and trends for your team

### For Administrators
- **Organization Dashboard**: Organization-wide workload analytics
- **User Management**: Create, edit, and manage all users
- **System Configuration**: Adjust thresholds and system settings
- **Department Reports**: Compare workload across departments

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt, helmet, rate limiting

### Frontend
- **Framework**: Next.js 14 (React)
- **Styling**: Custom CSS Design System
- **Charts**: Chart.js with react-chartjs-2
- **State Management**: React Context API

## 📁 Project Structure

```
SEAPM/
├── backend/
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   └── roleCheck.js       # Role-based access control
│   ├── routes/
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── users.js           # User management
│   │   ├── tasks.js           # Task CRUD operations
│   │   ├── workload.js        # Workload analysis
│   │   ├── alerts.js          # Notification management
│   │   ├── reports.js         # Analytics and reports
│   │   └── config.js          # System configuration
│   ├── services/
│   │   ├── workloadEngine.js  # Workload scoring algorithm
│   │   ├── burnoutDetector.js # Burnout risk detection
│   │   └── alertService.js    # Alert generation
│   ├── utils/
│   │   └── helpers.js         # Utility functions
│   ├── server.js              # Express server entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/        # Auth pages (login, register)
│   │   │   ├── employee/      # Employee dashboard
│   │   │   ├── manager/       # Manager dashboard
│   │   │   ├── admin/         # Admin dashboard
│   │   │   ├── layout.js      # Root layout
│   │   │   ├── page.js        # Landing page
│   │   │   └── globals.css    # Design system
│   │   ├── components/
│   │   │   └── layout/        # Layout components
│   │   ├── context/
│   │   │   └── AuthContext.js # Auth state management
│   │   └── lib/
│   │       └── api.js         # API service layer
│   ├── package.json
│   ├── next.config.js
│   └── .env.example
│
└── database/
    └── schema.sql             # PostgreSQL schema
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager

### Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE seapm;
```

2. Run the schema file:
```bash
psql -U postgres -d seapm -f database/schema.sql
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seapm
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

5. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Demo Credentials

After running the schema with seed data:

| Role     | Email                | Password |
|----------|---------------------|----------|
| Admin    | admin@company.com   | password |
| Manager  | manager@company.com | password |
| Employee | alice@company.com   | password |
| Employee | bob@company.com     | password |

## 📊 Workload Scoring Algorithm

The workload score (0-100) is calculated based on:

1. **Task Count Score** (25%): Number of active tasks relative to threshold
2. **Priority Score** (25%): Weighted sum of task priorities
3. **Deadline Score** (30%): Proximity of upcoming deadlines
4. **Hours Score** (20%): Estimated weekly hours

### Risk Levels
- **Low Risk** (0-40): Manageable workload
- **Medium Risk** (41-70): Elevated workload, monitor closely
- **High Risk** (71-100): Critical, intervention needed

## 🔥 Burnout Detection

The burnout detection system analyzes:
- Consecutive high workload days
- Deadline clustering
- Weekly hours worked
- Workload trend direction
- Overdue task count

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Users (Admin)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `PUT /api/tasks/:id/progress` - Update progress
- `PUT /api/tasks/:id/status` - Update status

### Workload
- `GET /api/workload/score` - Get current score
- `GET /api/workload/history` - Get score history
- `GET /api/workload/burnout` - Get burnout assessment
- `POST /api/workload/calculate` - Recalculate score

### Reports
- `GET /api/reports/dashboard` - Dashboard data
- `GET /api/reports/workload` - Workload trends
- `GET /api/reports/burnout` - Burnout statistics
- `GET /api/reports/team` - Team performance

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- Input validation
- CORS configuration
- Helmet security headers

## 📈 Future Enhancements

- [ ] Email notifications
- [ ] Slack/Teams integration
- [ ] Mobile app (React Native)
- [ ] Advanced analytics with ML
- [ ] Custom report builder
- [ ] Time tracking integration
- [ ] Calendar sync

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for employee wellbeing
