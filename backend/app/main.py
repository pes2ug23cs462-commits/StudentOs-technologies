
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.plans import router as plans_router
from app.api.students import router as students_router
from app.api.tasks import router as tasks_router
from app.api.goals import router as goals_router
from app.api.student_context import router as student_context_router
from app.api.auth import router as auth_router
from app.api.otp import router as otp_router
from app.api.profile_documents import (
    router as profile_documents_router,
)

app = FastAPI(
    title="StudentOS API",
    description="Backend API for the StudentOS AI Mentor",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Welcome to StudentOS API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "StudentOS API",
    }


# Register all routers after creating the FastAPI application.
app.include_router(students_router)
app.include_router(tasks_router)
app.include_router(goals_router)
app.include_router(student_context_router)
app.include_router(auth_router)
app.include_router(otp_router)
app.include_router(plans_router)
app.include_router(profile_documents_router)

