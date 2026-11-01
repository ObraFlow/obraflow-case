from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Pedido(Base):
    __tablename__ = "pedido"

    __table_args__ = (
        CheckConstraint("total_centavos >= 0", name="ck_pedido_total"),
        CheckConstraint(
            "status IN ('PENDENTE', 'APROVADO', 'REJEITADO')",
            name="ck_pedido_status",
        ),
        CheckConstraint(
            "etapa_atual IS NULL OR etapa_atual >= 1",
            name="ck_pedido_etapa_atual",
        ),
    )

    id_pedido: Mapped[int] = mapped_column(primary_key=True)
    id_obra: Mapped[int] = mapped_column(
        ForeignKey("obra.id_obra", ondelete="RESTRICT"),
        nullable=False,
    )
    id_fornecedor: Mapped[int] = mapped_column(
        ForeignKey("fornecedor.id_fornecedor", ondelete="RESTRICT"),
        nullable=False,
    )
    data_pedido: Mapped[date] = mapped_column(Date, nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="PENDENTE",
    )
    etapa_atual: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        server_default="1",
    )
