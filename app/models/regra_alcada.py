from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RegraAlcada(Base):
    __tablename__ = "regra_alcada"

    __table_args__ = (
        CheckConstraint(
            "limite_superior_centavos IS NULL OR limite_superior_centavos >= 0",
            name="ck_regra_alcada_limite",
        ),
        UniqueConstraint(
            "id_obra",
            "limite_superior_centavos",
            name="uq_regra_alcada_limite",
        ),
        Index(
            "uq_regra_alcada_faixa_final",
            "id_obra",
            unique=True,
            sqlite_where=text("limite_superior_centavos IS NULL"),
        ),
    )

    id_regra: Mapped[int] = mapped_column(primary_key=True)
    id_obra: Mapped[int] = mapped_column(
        ForeignKey("obra.id_obra", ondelete="RESTRICT"),
        nullable=False,
    )
    limite_superior_centavos: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
