from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import matching_route, trials_route, patients_route, analytics_route, auth_route


def create_app() -> FastAPI:
    """Factory function to create and configure the FastAPI application."""
    app = FastAPI(title="Trial Match Intelligence System")

    # Security - CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount logical modules
    app.include_router(auth_route.router)
    app.include_router(patients_route.router)
    app.include_router(matching_route.router)
    app.include_router(trials_route.router)
    app.include_router(analytics_route.router)

    # Health check endpoint
    @app.get("/")
    async def health():
        return {"status": "Intelligent Matcher Online", "version": "2.0"}

    return app

# Create app instance for ASGI servers (uvicorn, gunicorn)
app = create_app()