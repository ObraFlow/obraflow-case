from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Obra


class ObraRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, obra: Obra) -> Obra:
        self.session.add(obra)
        return obra

    def list_all(self) -> list[Obra]:
        statement = select(Obra).order_by(Obra.id_obra)
        return list(self.session.scalars(statement))
