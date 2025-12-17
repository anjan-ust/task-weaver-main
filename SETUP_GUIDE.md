# Setup Guide - UST Employee Management System

This guide will help you set up and run the complete UST Employee Management System (JIRA-lite).

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.10 or higher) - [Download](https://www.python.org/downloads/)
- **MySQL** (v8.0 or higher) - [Download](https://dev.mysql.com/downloads/)
- **MongoDB** (v5.0 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/downloads)

## 🚀 Quick Start

### Step 1: Database Setup

#### MySQL Setup

1. Start MySQL server
2. Open MySQL command line or MySQL Workbench
3. Create the database:

```sql
CREATE DATABASE ust_task_db;
USE ust_task_db;
```

4. The tables will be automatically created by SQLAlchemy when you first run the backend.

#### MongoDB Setup

1. Start MongoDB server:

**Windows:**

```bash
# Start MongoDB as a service
net start MongoDB
```

**macOS:**

```bash
brew services start mongodb-community
```

**Linux:**

```bash
sudo systemctl start mongod
```

2. MongoDB will automatically create the database and collections on first use.

### Step 2: Backend Setup

1. Open a terminal and navigate to the backend directory:

```bash
cd backend
```

2. Create a Python virtual environment:

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

4. Create environment file:

**Windows:**

```bash
copy env.template .env
```

**macOS/Linux:**

```bash
cp env.template .env
```

5. Edit the `.env` file with your database credentials:

```env
# JWT Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production-12345678
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

6. Run database migrations (create tables):

```bash
python -c "from app.database.mysql_connection import engine, Base; from app.models.models import *; Base.metadata.create_all(bind=engine)"
```

7. Start the backend server:

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### Step 3: Frontend Setup

1. Open a **NEW terminal** (keep the backend running)
2. Navigate to the project root directory:

```bash
cd ..  # If you're in the backend directory
```

3. Install Node.js dependencies:

```bash
npm install
```

4. Create environment file:

**Windows:**

```bash
copy env.template .env
```

**macOS/Linux:**

```bash
cp env.template .env
```

5. Edit the `.env` file (usually the defaults are fine):

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=UST Employee Management
```

6. Start the frontend development server:

```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`

### Step 4: Initialize Sample Data (Optional)

You can create sample data using the API documentation at `http://localhost:8000/docs`

#### Create Admin User

1. First, create an employee:

```json
POST /api/employees
{
  "name": "Admin User",
  "email": "admin@ust.com",
  "designation": "System Administrator"
}
```

2. Then create a user account for that employee:

```json
POST /api/users
{
  "e_id": 1,
  "password": "password123",
  "role": "Admin",
  "status": "active"
}
```

#### Create Manager and Developer Users

Repeat the above steps with different roles:

**Manager:**

```json
// Employee
{
  "name": "Manager User",
  "email": "manager@ust.com",
  "designation": "Project Manager",
  "mgr_id": 1
}

// User
{
  "e_id": 2,
  "password": "password123",
  "role": "Manager",
  "status": "active"
}
```

**Developer:**

```json
// Employee
{
  "name": "Developer User",
  "email": "developer@ust.com",
  "designation": "Software Developer",
  "mgr_id": 2
}

// User
{
  "e_id": 3,
  "password": "password123",
  "role": "Developer",
  "status": "active"
}
```

## 🔧 Troubleshooting

### Backend Issues

#### Port 8000 already in use

```bash
# Find and kill the process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

#### MySQL Connection Error

- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `backend/.env`
- Ensure database `ust_task_db` exists

#### MongoDB Connection Error

- Verify MongoDB is running:

  ```bash
  # Windows
  sc query MongoDB

  # macOS/Linux
  sudo systemctl status mongod
  ```

#### Import Errors

- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend Issues

#### Port 5173 already in use

Edit `vite.config.ts` and change the port:

```typescript
export default defineConfig({
  server: {
    port: 3000, // Change to any available port
  },
});
```

#### API Connection Errors

- Verify backend is running at `http://localhost:8000`
- Check `VITE_API_BASE_URL` in `.env`
- Check browser console for CORS errors

#### Module Not Found Errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📝 Default Credentials

After creating sample data, you can login with:

| Employee ID | Password    | Role      |
| ----------- | ----------- | --------- |
| 1           | password123 | Admin     |
| 2           | password123 | Manager   |
| 3           | password123 | Developer |

## 🎯 Next Steps

1. **Explore the API**: Visit `http://localhost:8000/docs` to see all available endpoints
2. **Create Tasks**: Login as Admin or Manager and create some tasks
3. **Assign Tasks**: Assign tasks to developers
4. **Test Workflow**: Move tasks through the workflow (TO_DO → IN_PROGRESS → REVIEW → DONE)
5. **Add Remarks**: Add comments to tasks

## 🔐 Security Notes

⚠️ **Important for Production:**

1. Change the `SECRET_KEY` in `backend/.env` to a strong, random string
2. Use strong passwords for database users
3. Enable HTTPS in production
4. Update CORS origins in `backend/main.py` to match your production domain
5. Never commit `.env` files to version control

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)

## 🆘 Getting Help

If you encounter any issues:

1. Check the terminal logs for error messages
2. Review the API documentation at `/docs`
3. Check the browser console for frontend errors
4. Verify all services (MySQL, MongoDB) are running
5. Ensure all environment variables are correctly set

## 🎉 Success!

If everything is set up correctly, you should be able to:

✅ Access the frontend at `http://localhost:5173`
✅ Login with demo credentials
✅ View the dashboard
✅ Create and manage employees
✅ Create and assign tasks
✅ Use the Kanban board
✅ Add remarks to tasks

Happy coding! 🚀
