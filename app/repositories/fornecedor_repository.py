from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Fornecedor


class FornecedorRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, fornecedor: Fornecedor) -> Fornecedor:
        self.session.add(fornecedor)

        return fornecedor

    def exists_by_cnpj(self, cnpj: str) -> bool:
        statement = (
            select(Fornecedor.id_fornecedor).where(Fornecedor.cnpj == cnpj).limit(1)
        )

        return self.session.scalar(statement) is not None

    def list_all(self) -> list[Fornecedor]:
        statement = select(Fornecedor).order_by(Fornecedor.id_fornecedor)

        return list(self.session.scalars(statement))
