from fastapi import APIRouter, HTTPException

from app.dependencies import SessionDep
from app.schemas.alcada import AlcadasUpdate
from app.services.alcada_service import listar_alcadas, salvar_alcadas

router = APIRouter(
    prefix="/obras/{id_obra}/alcadas",
    tags=["alçadas"],
)


@router.get("", response_model=AlcadasUpdate)
def get_alcadas(id_obra: int, session: SessionDep) -> AlcadasUpdate:
    try:
        return listar_alcadas(session, id_obra)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.put("", response_model=AlcadasUpdate)
def update_alcadas(
    id_obra: int,
    dados: AlcadasUpdate,
    session: SessionDep,
) -> AlcadasUpdate:
    try:
        salvar_alcadas(session, id_obra, dados)
        return listar_alcadas(session, id_obra)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
