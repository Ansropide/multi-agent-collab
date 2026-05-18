from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="本地智能体管理系统", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Register routers
from .api.agents import router as agents_router
from .api.conversations import router as conversations_router
from .api.messages import router as messages_router
from .api.model_configs import router as model_configs_router

app.include_router(agents_router)
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(model_configs_router)
