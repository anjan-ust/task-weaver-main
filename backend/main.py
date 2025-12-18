from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.employee_router import employee_router
from app.routers.user_router import users_router
from app.routers.task_router import task_router
from app.routers.remark_router import remark_router
from app.routers.file_router import file_router
from app.routers.auth_router import auth_router
from app.middleware.error_handler import error_handler_middleware
from app.middleware.logging_middleware import logging_middleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="UST Employee Task Management",
    description="JIRA-lite Employee Management System with role-based access control",
    version="1.0.0"
)

# CORS Configuration for Frontend Integration
origins = [
    "http://localhost:5173",  # Vite default port
    "http://localhost:3000",  # Alternative React port
    "http://localhost:8080",  # Current frontend port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
]

# During development allow all origins to avoid CORS issues from various dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # allow only listed dev origins (keeps credentials working)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add custom middleware
app.middleware("http")(error_handler_middleware)
app.middleware("http")(logging_middleware)


# NOTE: Removed a custom fallback OPTIONS handler in favor of FastAPI's
# CORSMiddleware above. CORSMiddleware properly handles preflight requests
# (OPTIONS) and sets the Access-Control-Allow-* headers for configured
# origins. Keeping a custom short-circuiting middleware can interfere with
# middleware ordering and cause inconsistent preflight responses.

# Include routers with API prefix (router-level tags are used to avoid duplicate tag entries in OpenAPI)
app.include_router(auth_router, prefix="/api")
app.include_router(employee_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(task_router, prefix="/api")
app.include_router(remark_router, prefix="/api")
app.include_router(file_router, prefix="/api")

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "UST Employee Task Management API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "UST Employee Management API"}