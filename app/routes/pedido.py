from fastapi import APIRouter, HTTPException, status

from app.dependencies import SessionDep
from app.models import Pedido
from app.schemas import (
    DecisaoPedidoInput,
    PedidoCreate,
    PedidoDetalheResponse,
    PedidoListaResponse,
    PedidoResponse,
)
from app.services.pedido_service import (
    criar_pedido,
    decidir_pedido,
    detalhar_pedido,
    listar_pedidos,
)

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


@router.post(
    "",
    response_model=PedidoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_pedido(dados: PedidoCreate, session: SessionDep) -> Pedido:
    try:
        return criar_pedido(session, dados)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("", response_model=list[PedidoListaResponse])
def list_pedidos(session: SessionDep) -> list[PedidoListaResponse]:
    return listar_pedidos(session)


@router.get("/{id_pedido}", response_model=PedidoDetalheResponse)
def get_pedido(id_pedido: int, session: SessionDep) -> PedidoDetalheResponse:
    try:
        return detalhar_pedido(session, id_pedido)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/{id_pedido}/decisoes", response_model=PedidoResponse)
def create_decisao(
    id_pedido: int,
    dados: DecisaoPedidoInput,
    session: SessionDep,
) -> Pedido:
    try:
        return decidir_pedido(session, id_pedido, dados)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
