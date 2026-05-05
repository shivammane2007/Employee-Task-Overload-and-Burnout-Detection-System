<<<<<<< HEAD
# 🛡️ SEAPM: Employee Task Overload & Burnout Detection System
=======
# 🛡️ Software Requirements Specification (SRS)
## SEAPM: Employee Task Overload & Burnout Detection System
>>>>>>> 886ef1d9b39e16d77f35cc5693beb1684b91f17d

[![Licence](https://img.shields.io/github/license/shivammane2007/Employee-Task-Overload-and-Burnout-Detection-System?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-blue?style=for-the-badge&logo=sqlite)](https://sqlite.org/)

<<<<<<< HEAD
**SEAPM** (Smart Employee Analytics & Performance Management) is a high-end, data-driven platform designed to prioritize employee wellbeing while optimizing organizational productivity. By leveraging advanced workload scoring and longitudinal burnout detection algorithms, SEAPM provides actionable insights to prevent overwork before it impacts team health.

---

## 🏛️ System Architecture

SEAPM follows a modern decoupled architecture designed for speed and clarity:

=======
---

## 📄 Executive Summary

**SEAPM** (Smart Employee Analytics & Performance Management) is an enterprise-grade, data-driven platform engineered to synchronize organizational productivity with employee psychological safety. By employing longitudinal burnout detection and multi-factor workload scoring, SEAPM shifts the paradigm from reactive management to proactive wellbeing intervention.

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to provide a comprehensive description of the SEAPM system. It defines the functional and non-functional requirements for the platform, ensuring that all stakeholders (Developers, Managers, and Administrators) have a unified understanding of the system's objectives and operational constraints.

### 1.2 Project Scope
SEAPM is designed to monitor, analyze, and mitigate employee burnout. It provides:
- Real-time workload calculation based on task volume and complexity.
- Predictive burnout risk assessment using historical data trends.
- Hierarchical dashboards for Employees, Managers, and Administrators.
- Automated alerting mechanisms for critical workload thresholds.

### 1.3 Definitions and Acronyms
| Term | Definition |
| :--- | :--- |
| **SEAPM** | Smart Employee Analytics & Performance Management System. |
| **Workload Score** | A normalized value (0-100) representing an individual's current professional load. |
| **Burnout Risk** | A longitudinal assessment of potential fatigue based on sustained high workload. |
| **RBAC** | Role-Based Access Control (Employee, Manager, Admin). |

---

## 2. Overall Description

### 2.1 Product Perspective
SEAPM operates as a standalone web application utilizing a decoupled architecture. It provides a bridge between task management systems and HR wellbeing initiatives, focusing specifically on the human cost of productivity.

### 2.2 Product Functions
- **Authentication**: Secure multi-role login with JWT-based session management.
- **Task Management**: CRUD operations for tasks with priority and effort estimation.
- **Analytics Engine**: Real-time calculation of workload and burnout metrics.
- **Reporting**: Visual trend analysis and team-wide pulse checks.
- **System Configuration**: Dynamic threshold adjustment for risk levels.

### 2.3 User Classes and Characteristics
1.  **Employee**: Primary data contributors. Focus on task completion and personal wellbeing tracking.
2.  **Manager**: Oversees teams. Focus on load balancing and preventing team exhaustion.
3.  **Administrator**: System owners. Focus on organization-wide metrics and system integrity.

### 2.4 Operating Environment
- **Client**: Modern web browsers (Chrome, Firefox, Safari, Edge).
- **Server**: Node.js 18+ environment.
- **Database**: SQLite (Development) / PostgreSQL compatible logic.

---

## 3. System Features (Functional Requirements)

### 3.1 Core Security & Access (RBAC)
- **Requirement**: The system must enforce strict role-based access.
- **Features**: 
  - Password encryption using `bcrypt`.
  - Token-based authentication using `JSON Web Tokens (JWT)`.
  - Middleware-level route protection for sensitive admin/manager endpoints.

### 3.2 Intelligent Workload Scoring Engine
The system calculates a **Workload Score ($W_s$)** using the following weighted factors:

$$W_s = (V \times 0.25) + (P \times 0.25) + (D \times 0.25) + (H \times 0.25)$$

Where:
- **V (Volume)**: Ratio of active tasks to user capacity.
- **P (Priority)**: Weighted sum of high-priority assignments.
- **D (Deadline)**: Proximity pressure (Overdue = Max impact).
- **H (Hours)**: Estimated effort relative to the 40-hour standard week.

### 3.3 Longitudinal Burnout Detection
Unlike snapshot metrics, burnout is detected over a **7-day rolling window**:
- **Persistence**: 3+ consecutive days with $W_s > 70$.
- **Volatility**: Sudden workload spikes ($ \Delta W_s > 25$ in 24h).
- **Backlog**: Accumulation of overdue tasks exceeding 20% of total volume.

### 3.4 Managerial Insights & Redistribution
- **Team Pulse**: Heatmaps showing workload distribution across the team.
- **Risk Identification**: Automated flagging of employees in the "High Risk" quadrant.
- **Redistribution Logic**: Data-driven recommendations for moving tasks from high-load to low-load members.

### 3.5 Real-time Communication & Notifications
- **Requirement**: The system must provide instant updates for critical alerts.
- **Features**: 
  - **Socket.io Integration**: Real-time push notifications for high-risk workload alerts.
  - **In-App Alerts**: Persistent notification center for longitudinal trend warnings.

---

## 4. Technical Architecture

### 4.1 System Diagram
>>>>>>> 886ef1d9b39e16d77f35cc5693beb1684b91f17d
```mermaid
graph TD
    User((User)) <--> Frontend[Next.js 14 Frontend]
    Frontend <--> API[Express.js API Layer]
<<<<<<< HEAD
=======
    API <--> Sockets[Socket.io Real-time]
>>>>>>> 886ef1d9b39e16d77f35cc5693beb1684b91f17d
    
    subgraph "Backend Core"
        API <--> WE[Workload Engine]
        API <--> BD[Burnout Detector]
<<<<<<< HEAD
        WE <--> DB[(SQLite DB)]
=======
        WE <--> DB[(PostgreSQL / SQLite)]
>>>>>>> 886ef1d9b39e16d77f35cc5693beb1684b91f17d
        BD <--> DB
    end
    
    WE -- calculates --> Scores[Workload Scores]
    BD -- assesses --> Risks[Burnout Risks]
```

<<<<<<< HEAD
---

## ✨ Key Features

### 👤 For Employees
*   **Intelligent Dashboard**: Real-time visualization of workload components and risk trends.
*   **Smart Task Tracking**: Interactive task management with automatic impact calculation.
*   **Wellbeing Alerts**: Proactive notifications when workload reaches critical thresholds.
*   **Predictive Assessment**: Personalized burnout risk evaluation based on recent work patterns.

### 👥 For Managers
*   **Team Pulse Overview**: Monitor team-wide workload distribution at a glance.
*   **High-Risk Identification**: Instant detection of team members approaching burnout.
*   **Strategic Redistribution**: Data-driven task assignment to balance load across the team.
*   **Performance Analytics**: Historical trends and performance correlate for proactive management.

### 🔐 For Administrators
*   **Enterprise Insights**: Organization-wide health metrics and departmental comparisons.
*   **Global Configuration**: Fine-tune workload thresholds and scoring weights.
*   **Security & Audit**: Comprehensive user management with role-based access control (RBAC).

---

## 🧠 Core Intelligence

### 📊 Workload Scoring Engine
The system calculates a normalized **Workload Score (0-100)** using a multi-factor weighted algorithm:

| Factor | Weight | Description |
| :--- | :--- | :--- |
| **Task Volume** | 25% | Number of active/pending tasks relative to capacity. |
| **Priority Load** | 25% | Intensity of high-priority responsibilities. |
| **Deadline Pressure** | 25% | Proximity and clustering of upcoming deadlines (30pts for overdue, 15pts for due soon). |
| **Capacity Hours** | 25% | Estimated weekly effort vs. the 40-hour standard threshold. |

> [!TIP]
> **Risk Levels**: `Low (<40)`, `Medium (40-69)`, `High (>=70)`

### 🔥 Burnout Detection Logic
Unlike static metrics, the **Burnout Risk Assessment** analyzes longitudinal patterns over a rolling 7-day window:
1.  **Persistence**: Tracks consecutive days spent in "High Risk" workload territory.
2.  **Trend-line**: Identifies worsening workload directions (Score ∆ > 20).
3.  **Backlog Build-up**: Monitors accumulation of overdue tasks.
4.  **Clustering**: Detects "deadline storms" (multiple tasks due within a 72-hour window).

---

## 🎨 Design Philosophy

SEAPM features a **Premium Custom Design System** built from the ground up for clarity and focus:
*   **Cinematic UI**: Vibrant, harmonious color palettes (HSL-based tokens).
*   **Data Visualization**: Custom Chart.js integrations for intuitive performance tracking.
*   **Glassmorphism & Depth**: Subtle shadows and elevated surfaces for a modern, tactile feel.
*   **Responsive Precision**: Liquid layouts optimized for seamless transitions between desktop and tablet.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14, React, Context API, Chart.js, Vanilla CSS Design System |
| **Backend** | Node.js, Express.js, JWT, bcrypt, Helmet Security |
| **Database** | SQLite (Fast, local-first development with persistence) |
| **DevOps** | NPM, Git, Environment-based Configuration |

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 18.x or higher
*   NPM 9.x or higher

### 1. Repository Setup
```bash
git clone https://github.com/shivammane2007/Employee-Task-Overload-and-Burnout-Detection-System.git
cd Employee-Task-Overload-and-Burnout-Detection-System
```

### 2. Backend Initialization (API)
```bash
cd backend

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
=======
### 4.2 Tech Stack Details
| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 (App Router) | Server-side rendering for performance and SEO. |
| **Logic** | Node.js / Express.js | Scalable, event-driven architecture for real-time calculations. |
| **Real-time** | Socket.io | Low-latency bi-directional communication for alerts. |
| **Database** | PostgreSQL / SQLite | Robust relational storage with local-first dev support. |
| **Security** | Helmet.js / Rate-Limit / JWT | Enterprise protection including DDoS mitigation. |

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Latency**: API response times must remain below 200ms for standard queries.
- **Concurrency**: Support for 1000+ simultaneous socket connections.

### 5.2 Security & Privacy
- **Protection**: Implementation of `express-rate-limit` to prevent brute-force attacks.
- **Encryption**: Industry-standard bcrypt hashing for sensitive credentials.

### 5.3 Software Quality Attributes
- **Maintainability**: Modular code structure using Controller-Service patterns.
- **Reliability**: 99.9% uptime for the monitoring dashboard.
- **Usability**: Premium, HSL-based design system optimized for cognitive ease.

---

## 6. Installation & Deployment

### 6.1 Local Development Setup
1.  **Clone Repository**:
    ```bash
    git clone https://github.com/shivammane2007/Employee-Task-Overload-and-Burnout-Detection-System.git
    ```
2.  **Environment Configuration**:
    Create `.env` files in both `backend/` and `frontend/` using provided `.env.example` templates.
3.  **Dependency Installation**:
    ```bash
    # Backend
    cd backend && npm install
    # Frontend
    cd ../frontend && npm install
    ```
4.  **Run Application**:
    ```bash
    # Backend (Starts on port 5000)
    npm run dev
    # Frontend (Starts on port 3000)
    npm run dev
    ```

---

## 7. Future Roadmap

- [ ] **ML Integration**: Training models to predict burnout before it appears in workload scores.
- [ ] **Third-Party Sync**: Integration with Jira, Slack, and Microsoft Teams.
- [ ] **Mobile Application**: Native iOS/Android apps for real-time notifications.
- [ ] **Advanced Reporting**: Automated PDF generation for quarterly HR reviews.

---

## 📄 License
This project is licensed under the **MIT License**.

---
*Built with precision for organizational health.*
>>>>>>> 886ef1d9b39e16d77f35cc5693beb1684b91f17d
