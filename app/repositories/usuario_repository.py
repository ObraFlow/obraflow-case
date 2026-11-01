from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Usuario


class UsuarioRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, usuario: Usuario) -> Usuario:
        self.session.add(usuario)
        return usuario

    def list_all(self) -> list[Usuario]:
        statement = select(Usuario).order_by(Usuario.id_usuario)
        return list(self.session.scalars(statement))
