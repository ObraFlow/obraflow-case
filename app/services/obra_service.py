from sqlalchemy.orm import Session

from app.models import Obra
from app.repositories import ObraRepository
from app.schemas import ObraCreate


class ObraService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ObraRepository(session)

    def create(self, data: ObraCreate) -> Obra:
        obra = Obra(nome_obra=data.nome_obra)

        try:
            self.repository.add(obra)
            self.session.commit()
        except Exception:
            self.session.rollback()
            raise

        self.session.refresh(obra)
        return obra

    def list_all(self) -> list[Obra]:
        return self.repository.list_all()
