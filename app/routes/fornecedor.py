from fastapi import APIRouter, HTTPException, status

from app.dependencies import SessionDep
from app.exceptions import CnpjAlreadyExistsError
from app.models import Fornecedor
from app.schemas import FornecedorCreate, FornecedorResponse
from app.services import FornecedorService

router = APIRouter(
    prefix="/fornecedores",
    tags=["fornecedores"],
)


@router.post(
    "",
    response_model=FornecedorResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_fornecedor(
    data: FornecedorCreate,
    session: SessionDep,
) -> Fornecedor:
    service = FornecedorService(session)

    try:
        return service.create(data)
    except CnpjAlreadyExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.get(
    "",
    response_model=list[FornecedorResponse],
)
def list_fornecedores(session: SessionDep) -> list[Fornecedor]:
    service = FornecedorService(session)

    return service.list_all()
