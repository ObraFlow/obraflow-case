from sqlalchemy import CheckConstraint, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Fornecedor(Base):
    __tablename__ = "fornecedor"

    __table_args__ = (
        UniqueConstraint("cnpj", name="uq_fornecedor_cnpj"),
        CheckConstraint(
            "length(cnpj) = 14 AND cnpj NOT GLOB '*[^0-9]*'",
            name="ck_fornecedor_cnpj",
        ),
    )

    id_fornecedor: Mapped[int] = mapped_column(primary_key=True)
    nome_fornecedor: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    cnpj: Mapped[str] = mapped_column(String(14), nullable=False)
    rua: Mapped[str] = mapped_column(String(200), nullable=False)
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)
