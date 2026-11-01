from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Obra(Base):
    __tablename__ = "obra"

    id_obra: Mapped[int] = mapped_column(primary_key=True)
    nome_obra: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
