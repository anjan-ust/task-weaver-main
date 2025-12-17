# UST Employee Management System (JIRA-lite)

A comprehensive employee task management system inspired by JIRA, featuring role-based access control, task tracking with drag-and-drop interface, and real-time notifications.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [User Roles & Permissions](#user-roles--permissions)
- [Task Workflow](#task-workflow)
- [Database Schema](#database-schema)

## 🎯 Overview

UST Employee Management System is a full-stack web application that streamlines task management with role-based access control. The system supports three distinct roles (Admin, Manager, Developer) and implements a complete task lifecycle management system.

## ✨ Features

### Core Features

- **Role-Based Access Control (RBAC)** - Three distinct user roles with specific permissions
- **Task Management** - Complete CRUD operations with status tracking
- **Drag & Drop Interface** - Intuitive kanban board with smooth animations
- **Real-Time Notifications** - Toast notifications for task updates
- **Employee Management** - Comprehensive employee directory with hierarchy
- **Remarks System** - Comment and feedback on tasks
- **Activity Logging** - MongoDB-based logging for audit trails
- **Pagination** - Efficient data loading for employees and tasks
- **JWT Authentication** - Secure token-based authentication
- **Responsive Design** - Beautiful UI with Tailwind CSS

### Advanced Features

- Color-coded task status (Blue: TO_DO, Yellow: IN_PROGRESS, Orange: REVIEW, Green: DONE)
- Manager hierarchy with employee assignment
- Task priority management (High/Medium/Low)
- Expected and actual closure date tracking
- Reviewer assignment for quality control
- File upload support for task documentation

## 🛠 Tech Stack

### Frontend

| Technology          | Purpose                 |
| ------------------- | ----------------------- |
| React 18            | UI Framework            |
| TypeScript          | Type Safety             |
| Vite                | Build Tool & Dev Server |
| Tailwind CSS        | Styling Framework       |
| shadcn/ui           | UI Components           |
| Axios               | HTTP Client             |
| React Router        | Routing                 |
| Lucide React        | Icons                   |
| React Toastify      | Notifications           |
| React Beautiful DnD | Drag & Drop             |

### Backend

| Technology  | Purpose              |
| ----------- | -------------------- |
| Python 3.14 | Programming Language |
| FastAPI     | REST API Framework   |
| Uvicorn     | ASGI Server          |
| Pydantic    | Data Validation      |
| SQLAlchemy  | ORM for MySQL        |
| PyMySQL     | MySQL Connector      |
| PyMongo     | MongoDB Driver       |
| python-jose | JWT Token Handling   |
| passlib     | Password Hashing     |

### Databases

- **MySQL** - Primary database for Users, Employees, Tasks
- **MongoDB** - Logging and Remarks storage

## 📁 Project Structure

```
task-weaver-main/
├── backend/                    # Python FastAPI Backend
│   ├── app/
│   │   ├── core/              # Core configurations
│   │   │   ├── dependencies.py
│   │   │   └── security.py    # JWT & Authentication
│   │   ├── crud/              # Database operations
│   │   │   ├── employee_crud.py
│   │   │   ├── task_crud.py
│   │   │   ├── users_crud.py
│   │   │   └── remarks_crud.py
│   │   ├── database/          # Database connections
│   │   │   ├── mysql_connection.py
│   │   │   └── mongodb_connection.py
│   │   ├── middleware/        # Custom middleware
│   │   │   ├── error_handler.py
│   │   │   └── logging_middleware.py
│   │   ├── models/            # SQLAlchemy models
│   │   │   └── models.py
│   │   ├── routers/           # API endpoints
│   │   │   ├── auth_router.py
│   │   │   ├── employee_router.py
│   │   │   ├── task_router.py
│   │   │   ├── user_router.py
│   │   │   └── remark_router.py
│   │   ├── schemas/           # Pydantic schemas
│   │   │   └── schemas.py
│   │   └── utils/             # Utility functions
│   │       ├── validators.py
│   │       ├── helpers.py
│   │       └── mongo_serializer.py
│   ├── main.py               # FastAPI application entry
│   ├── requirements.txt      # Python dependencies
│   └── env.template          # Environment variables template
│
├── src/                      # React Frontend
│   ├── components/           # React components
│   │   ├── dashboard/
│   │   ├── layout/
│   │   ├── tasks/
│   │   └── ui/              # shadcn/ui components
│   ├── context/             # React Context
│   │   └── AuthContext.tsx
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx
│   │   ├── TaskBoard.tsx
│   │   ├── Employees.tsx
│   │   ├── MyTasks.tsx
│   │   └── Login.tsx
│   ├── types/               # TypeScript types
│   └── lib/                 # Utilities
│
├── public/                  # Static assets
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
├── tailwind.config.ts      # Tailwind config
└── env.template            # Frontend env template
```

## 🚀 Installation

### Prerequisites

- **Node.js** (v18 or higher) & npm
- **Python** (v3.10 or higher)
- **MySQL** (v8.0 or higher)
- **MongoDB** (v5.0 or higher)

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd task-weaver-main
```

### Step 2: Frontend Setup

```bash
# Install frontend dependencies
npm install
```

### Step 3: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
```

### Step 4: Database Setup

#### MySQL Setup

```sql
-- Create database
CREATE DATABASE ust_task_db;

-- Use the database
USE ust_task_db;

-- Tables will be auto-created by SQLAlchemy
```

#### MongoDB Setup

MongoDB will automatically create the database and collections on first use.

## ⚙️ Configuration

### Backend Configuration

1. Copy the environment template:

```bash
cd backend
copy env.template .env  # Windows
# or
cp env.template .env    # macOS/Linux
```

2. Edit `backend/.env` with your configuration:

```env
# JWT Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# MySQL Database Configuration
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ust_task_db

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017
MONGO_DB=ust_task_logs

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### Frontend Configuration

1. Copy the environment template:

```bash
copy env.template .env  # Windows
# or
cp env.template .env    # macOS/Linux
```

2. Edit `.env` with your configuration:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=UST Employee Management
```

## 🏃 Running the Application

### Option 1: Run Frontend and Backend Separately

#### Terminal 1 - Backend

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

#### Terminal 2 - Frontend

```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173`

### Option 2: Using Scripts (Coming Soon)

```bash
# Run both frontend and backend
npm run dev:all

# Run only backend
npm run dev:backend

# Run only frontend
npm run dev:frontend
```

## 📚 API Documentation

Once the backend is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key API Endpoints

#### Authentication

- `POST /api/login` - User login (returns JWT token)

#### Employees

- `GET /api/employees` - List employees (with pagination)
- `POST /api/employees` - Create employee (Admin only)
- `GET /api/employees/{e_id}` - Get employee details
- `PUT /api/employees/{e_id}` - Update employee (Admin only)
- `DELETE /api/employees/{e_id}` - Delete employee (Admin only)

#### Tasks

- `GET /api/tasks` - List tasks (with pagination & filters)
- `POST /api/tasks` - Create task (Admin/Manager)
- `GET /api/tasks/{t_id}` - Get task details
- `PUT /api/tasks/{t_id}` - Update task
- `DELETE /api/tasks/{t_id}` - Delete task (Admin only)
- `PUT /api/tasks/{t_id}/status` - Update task status

#### Remarks

- `GET /api/remarks/{t_id}` - Get task remarks
- `POST /api/remarks` - Add remark to task

#### Users

- `GET /api/users` - List users (Admin only)
- `POST /api/users` - Create user (Admin/Manager)
- `PUT /api/users/{e_id}` - Update user
- `DELETE /api/users/{e_id}` - Delete user (Admin only)

## 👥 User Roles & Permissions

### 1. Admin

**Capabilities:**

- ✅ View, Create, Update, Delete employees
- ✅ View, Create, Update, Delete users
- ✅ View, Create, Update, Delete tasks
- ✅ Assign managers to any employee
- ✅ Assign tasks across all departments
- ✅ Change task status
- ❌ Cannot act as reviewer

### 2. Manager

**Capabilities:**

- ✅ View employees under their management
- ✅ Create and assign tasks to their team
- ✅ Change task status
- ✅ Act as reviewer for tasks
- ✅ Create users for employees they manage
- ✅ Can also be assigned tasks (dual role)

### 3. Developer

**Capabilities:**

- ✅ View assigned tasks
- ✅ Update task status (IN_PROGRESS → REVIEW)
- ✅ Add remarks to tasks
- ❌ Cannot create or delete tasks
- ❌ Cannot assign tasks to others

## 🔄 Task Workflow

```
TO_DO → IN_PROGRESS → REVIEW → DONE
```

### Status Transitions

| From        | To          | Who Can Change            | Conditions      |
| ----------- | ----------- | ------------------------- | --------------- |
| TO_DO       | IN_PROGRESS | Developer, Manager, Admin | Task assigned   |
| IN_PROGRESS | REVIEW      | Developer                 | Work completed  |
| REVIEW      | DONE        | Reviewer (Manager)        | Approved        |
| REVIEW      | IN_PROGRESS | Reviewer (Manager)        | Remark required |

### Status Rules

1. **TO_DO** - Default status when task is created by Manager/Admin
2. **IN_PROGRESS** - Developer starts working on the task
3. **REVIEW** - Developer submits for review
4. **DONE** - Reviewer approves (auto-sets actual_closure date)
5. **Review → IN_PROGRESS** - Reviewer can send back with mandatory remark

## 🗄️ Database Schema

### MySQL Tables

#### Employees Table

```sql
e_id            INT (PK, Auto-increment)
name            VARCHAR (Required)
email           VARCHAR (Required, Unique)
designation     VARCHAR (Required)
mgr_id          INT (Optional, FK → employees.e_id)
```

#### Users Table

```sql
e_id            INT (PK, FK → employees.e_id)
password        VARCHAR (Required, Hashed)
role            ENUM (Admin, Manager, Developer)
status          ENUM (active, inactive)
```

#### Tasks Table

```sql
t_id                INT (PK, Auto-increment)
title               VARCHAR (Required)
description         TEXT (Required)
created_by          INT (Required, FK → employees.e_id)
assigned_to         INT (Optional, FK → employees.e_id)
assigned_by         INT (Optional, FK → employees.e_id)
assigned_at         DATETIME (Optional, Auto)
updated_by          INT (Optional, FK → employees.e_id)
updated_at          DATETIME (Optional, Auto)
priority            ENUM (high, medium, low) (Required)
status              ENUM (to_do, in_progress, review, done) (Default: to_do)
reviewer            INT (Optional, FK → employees.e_id)
expected_closure    DATETIME (Required)
actual_closure      DATETIME (Optional, Auto on DONE)
```

### MongoDB Collections

#### Remarks Collection

```json
{
  "_id": ObjectId,
  "task_id": Number,
  "user_id": Number,
  "comment": String,
  "created_at": DateTime,
  "updated_at": DateTime
}
```

#### Logs Collection

```json
{
  "_id": ObjectId,
  "action": String,
  "endpoint": String,
  "user_id": Number,
  "status_code": Number,
  "timestamp": DateTime,
  "details": Object
}
```

## 🎨 UI Features

### Kanban Board

- **Color-coded columns**: Blue (TO_DO), Yellow (IN_PROGRESS), Orange (REVIEW), Green (DONE)
- **Drag & Drop**: Smooth animations with status update
- **Task Cards**: Priority badges, assignee info, due dates
- **Real-time Updates**: Instant UI refresh after changes

### Notifications

- Task assigned
- Status changed
- Task completed
- Review requested
- Remark added

### Pagination

- Employees: 20 per page
- Tasks: 10 per page
- Infinite scroll support

## 🔐 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based middleware protection
- CORS configuration for frontend
- SQL injection prevention (SQLAlchemy ORM)
- Input validation (Pydantic)
- Error handling middleware
- Activity logging for audit

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**

   - Ensure MySQL and MongoDB are running
   - Check credentials in `.env` file
   - Verify database exists

2. **Port Already in Use**

   ```bash
   # Backend: Change port in .env or command
   uvicorn main:app --port 8001

   # Frontend: Change port in vite.config.ts
   ```

3. **CORS Errors**

   - Verify frontend URL in `backend/main.py` CORS origins
   - Check `VITE_API_BASE_URL` in frontend `.env`

4. **Import Errors**
   - Ensure virtual environment is activated
   - Reinstall dependencies: `pip install -r requirements.txt`

## 📝 License

This project is developed for UST Employee Management purposes.

## 👨‍💻 Development

### Code Style

- Backend: Follow PEP 8 guidelines
- Frontend: ESLint + Prettier configuration

### Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
npm run test
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Built with ❤️ by UST Development Team**
