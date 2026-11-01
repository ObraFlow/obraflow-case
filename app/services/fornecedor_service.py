from sqlalchemy.orm import Session

from app.exceptions import CnpjAlreadyExistsError
from app.models import Fornecedor
from app.repositories import FornecedorRepository
from app.schemas import FornecedorCreate


class FornecedorService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = FornecedorRepository(session)

    def create(self, data: FornecedorCreate) -> Fornecedor:
        if self.repository.exists_by_cnpj(data.cnpj):
            raise CnpjAlreadyExistsError(data.cnpj)

        fornecedor = Fornecedor(
            nome_fornecedor=data.nome_fornecedor,
            cnpj=data.cnpj,
            rua=data.rua,
            cidade=data.cidade,
        )

        try:
            self.repository.add(fornecedor)
            self.session.commit()
        except Exception:
            self.session.rollback()
            raise

        self.session.refresh(fornecedor)

        return fornecedor

    def list_all(self) -> list[Fornecedor]:
        return self.repository.list_all()
