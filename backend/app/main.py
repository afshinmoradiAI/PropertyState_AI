import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_property import router as property_router
from app.core.config import settings

logging.basicConfig(level="INFO", format="%(asctime)s %(levelname)s %(name)s — %(message)s")

app = FastAPI(title="PropertyState AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(property_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
