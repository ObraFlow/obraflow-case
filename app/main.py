from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.dependencies import SessionDep
from app.models import Fornecedor, Obra
from app.routes import (
    alcada_router,
    fornecedor_router,
    obra_router,
    pedido_router,
    usuario_router,
)
from app.services import FornecedorService, ObraService, UsuarioService
from app.services.pedido_service import detalhar_pedido

app = FastAPI(title="ObraFlow")
app.mount(
    "/static",
    StaticFiles(directory=Path(__file__).resolve().parent / "static"),
    name="static",
)
app.include_router(fornecedor_router, prefix="/api")
app.include_router(obra_router, prefix="/api")
app.include_router(usuario_router, prefix="/api")
app.include_router(alcada_router, prefix="/api")
app.include_router(pedido_router, prefix="/api")

templates = Jinja2Templates(directory=Path(__file__).resolve().parent / "templates")


def formatar_reais(centavos: int) -> str:
    reais, centavos_restantes = divmod(centavos, 100)
    return f"R$ {reais:,}".replace(",", ".") + f",{centavos_restantes:02d}"


def formatar_quantidade(milesimos: int) -> str:
    inteiro, fracao = divmod(milesimos, 1000)
    if fracao == 0:
        return str(inteiro)
    return f"{inteiro},{fracao:03d}".rstrip("0")


templates.env.filters["reais"] = formatar_reais
templates.env.filters["quantidade"] = formatar_quantidade


@app.get("/", response_class=HTMLResponse)
def inicio(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="inicio.html",
        context={"titulo": "ObraFlow"},
    )


@app.get("/pedidos/novo", response_class=HTMLResponse)
def novo_pedido(request: Request, session: SessionDep):
    return templates.TemplateResponse(
        request=request,
        name="pedido_novo.html",
        context={
            "obras": ObraService(session).list_all(),
            "fornecedores": FornecedorService(session).list_all(),
            "data_hoje": date.today().isoformat(),
        },
    )


@app.get("/pedidos", response_class=HTMLResponse)
def pagina_pedidos(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="pedidos.html",
        context={},
    )


@app.get("/pedidos/{id_pedido}", response_class=HTMLResponse)
def pagina_detalhe_pedido(
    request: Request,
    id_pedido: int,
    session: SessionDep,
):
    try:
        detalhe = detalhar_pedido(session, id_pedido)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    obra = session.get(Obra, detalhe.pedido.id_obra)
    fornecedor = session.get(Fornecedor, detalhe.pedido.id_fornecedor)

    aprovacao_atual = next(
        (
            etapa
            for etapa in detalhe.etapas
            if etapa.ordem == detalhe.pedido.etapa_atual
        ),
        None,
    )

    return templates.TemplateResponse(
        request=request,
        name="pedido_detalhe.html",
        context={
            "detalhe": detalhe,
            "obra": obra,
            "fornecedor": fornecedor,
            "usuarios": UsuarioService(session).list_all(),
            "aprovacao_atual": aprovacao_atual,
        },
    )


@app.get("/alcadas", response_class=HTMLResponse)
def pagina_alcadas(request: Request, session: SessionDep):
    return templates.TemplateResponse(
        request=request,
        name="alcadas.html",
        context={"obras": ObraService(session).list_all()},
    )
