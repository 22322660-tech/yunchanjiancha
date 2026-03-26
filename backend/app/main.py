from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import dashboard, imports, products, schedules

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="兜爸心选 - 排品管理系统",
    description="Product scheduling management system for 兜爸心选",
    version="1.0.0",
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(products.router)
app.include_router(schedules.router)
app.include_router(imports.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"app": "兜爸心选 - 排品管理系统", "status": "running"}
