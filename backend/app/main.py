from fastapi import FastAPI

app = FastAPI(
    title="StudentOS API",
    description="Backend API for the StudentOS AI Mentor",
    version="0.1.0",
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

from app.api.students import router as students_router

app.include_router(students_router)

from app.api.tasks import router as tasks_router

app.include_router(tasks_router)

from app.api.student_context import router as student_context_router
app.include_router(student_context_router)

from app.api.auth import router as auth_router

app.include_router(auth_router)
