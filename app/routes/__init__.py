from app.routes.alcada import router as alcada_router
from app.routes.fornecedor import router as fornecedor_router
from app.routes.obra import router as obra_router
from app.routes.pedido import router as pedido_router
from app.routes.usuario import router as usuario_router

__all__ = [
    "alcada_router",
    "fornecedor_router",
    "obra_router",
    "pedido_router",
    "usuario_router",
]
