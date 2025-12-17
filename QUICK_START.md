# ⚡ Quick Start Guide

Get your UST Employee Management System up and running in 5 minutes!

## 🎯 Prerequisites Check

- [ ] MySQL installed and running
- [ ] MongoDB installed and running
- [ ] Python 3.10+ installed
- [ ] Node.js 18+ installed

## 🚀 Setup in 5 Steps

### 1️⃣ Setup MySQL Database (1 minute)

```sql
CREATE DATABASE ust_task_db;
```

### 2️⃣ Configure Backend (1 minute)

```bash
cd backend
copy env.template .env  # Windows
# or
cp env.template .env    # macOS/Linux
```

Edit `backend/.env` - **Only change these lines:**
```env
DB_PASSWORD=your_mysql_password
SECRET_KEY=change-this-to-random-string-12345
```

### 3️⃣ Install & Initialize Backend (2 minutes)

```bash
# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create tables
python init_db.py

# Add sample data (optional but recommended)
python seed_data.py
```

### 4️⃣ Install Frontend (1 minute)

```bash
cd ..  # Back to root directory
npm install
```

### 5️⃣ Start Everything! (30 seconds)

**Option A: Automatic (Windows)**
```bash
.\start-dev.ps1
```

**Option B: Automatic (macOS/Linux)**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

**Option C: Manual (Two Terminals)**

Terminal 1 - Backend:
```bash
cd backend
venv\Scripts\activate  # Windows
python -m uvicorn main:app --reload
```

Terminal 2 - Frontend:
```bash
npm run dev
```

## 🎉 You're Done!

Open your browser:
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

## 🔐 Login

Use these credentials (if you ran `seed_data.py`):

| Employee ID | Password | Role |
|-------------|----------|------|
| 1 | password123 | Admin |
| 2 | password123 | Manager |
| 3 | password123 | Developer |

## 🐛 Something Wrong?

### Backend won't start?
```bash
# Check if MySQL is running
mysql -u root -p

# Check if port 8000 is free
netstat -ano | findstr :8000  # Windows
lsof -ti:8000  # macOS/Linux
```

### Frontend won't start?
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Can't login?
- Did you run `seed_data.py`?
- Check backend terminal for errors
- Verify backend is running at http://localhost:8000

## 📚 Next Steps

1. ✅ Explore the dashboard
2. ✅ Create a new task (Admin/Manager)
3. ✅ Assign task to a developer
4. ✅ Move task through workflow
5. ✅ Add remarks to tasks

## 🆘 Need More Help?

- **Detailed Setup**: See `SETUP_GUIDE.md`
- **Full Documentation**: See `README.md`
- **Project Summary**: See `PROJECT_SUMMARY.md`
- **API Reference**: http://localhost:8000/docs

---

**Happy Coding! 🚀**

