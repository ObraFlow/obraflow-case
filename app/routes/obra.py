from fastapi import APIRouter, status

from app.dependencies import SessionDep
from app.models import Obra
from app.schemas import ObraCreate, ObraResponse
from app.services import ObraService

router = APIRouter(
    prefix="/obras",
    tags=["obras"],
)


@router.post(
    "",
    response_model=ObraResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_obra(data: ObraCreate, session: SessionDep) -> Obra:
    return ObraService(session).create(data)


@router.get(
    "",
    response_model=list[ObraResponse],
)
def list_obras(session: SessionDep) -> list[Obra]:
    return ObraService(session).list_all()
