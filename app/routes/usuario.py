from fastapi import APIRouter, status

from app.dependencies import SessionDep
from app.models import Usuario
from app.schemas import UsuarioCreate, UsuarioResponse
from app.services import UsuarioService

router = APIRouter(
    prefix="/usuarios",
    tags=["usuarios"],
)


@router.post(
    "",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_usuario(data: UsuarioCreate, session: SessionDep) -> Usuario:
    return UsuarioService(session).create(data)


@router.get(
    "",
    response_model=list[UsuarioResponse],
)
def list_usuarios(session: SessionDep) -> list[Usuario]:
    return UsuarioService(session).list_all()
