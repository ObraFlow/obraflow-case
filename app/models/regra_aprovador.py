from sqlalchemy import CheckConstraint, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RegraAprovador(Base):
    __tablename__ = "regra_aprovador"

    __table_args__ = (
        CheckConstraint("ordem >= 1", name="ck_regra_aprovador_ordem"),
        UniqueConstraint(
            "id_regra",
            "ordem",
            name="uq_regra_aprovador_ordem",
        ),
        UniqueConstraint(
            "id_regra",
            "id_usuario",
            name="uq_regra_aprovador_usuario",
        ),
    )

    id_regra_aprovador: Mapped[int] = mapped_column(primary_key=True)
    id_regra: Mapped[int] = mapped_column(
        ForeignKey("regra_alcada.id_regra", ondelete="CASCADE"),
        nullable=False,
    )
    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("usuario.id_usuario", ondelete="RESTRICT"),
        nullable=False,
    )
    ordem: Mapped[int] = mapped_column(nullable=False)
