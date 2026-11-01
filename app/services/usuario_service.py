from sqlalchemy.orm import Session

from app.models import Usuario
from app.repositories import UsuarioRepository
from app.schemas import UsuarioCreate


class UsuarioService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = UsuarioRepository(session)

    def create(self, data: UsuarioCreate) -> Usuario:
        usuario = Usuario(nome_usuario=data.nome_usuario)

        try:
            self.repository.add(usuario)
            self.session.commit()
        except Exception:
            self.session.rollback()
            raise

        self.session.refresh(usuario)
        return usuario

    def list_all(self) -> list[Usuario]:
        return self.repository.list_all()
