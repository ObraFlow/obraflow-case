from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EtapaAprovacao(Base):
    __tablename__ = "etapa_aprovacao"

    __table_args__ = (
        UniqueConstraint(
            "id_pedido",
            "ordem",
            name="uq_etapa_pedido_ordem",
        ),
        UniqueConstraint(
            "id_pedido",
            "id_usuario",
            name="uq_etapa_pedido_usuario",
        ),
        CheckConstraint("ordem >= 1", name="ck_etapa_ordem"),
        CheckConstraint(
            "status IN ('PENDENTE', 'APROVADO', 'REJEITADO')",
            name="ck_etapa_status",
        ),
        CheckConstraint(
            "status != 'REJEITADO' OR "
            "(motivo_rejeicao IS NOT NULL "
            "AND length(trim(motivo_rejeicao)) > 0)",
            name="ck_etapa_motivo_rejeicao",
        ),
    )

    id_etapa: Mapped[int] = mapped_column(primary_key=True)
    id_pedido: Mapped[int] = mapped_column(
        ForeignKey("pedido.id_pedido", ondelete="RESTRICT"),
        nullable=False,
    )
    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("usuario.id_usuario", ondelete="RESTRICT"),
        nullable=False,
    )
    nome_aprovador: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    ordem: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="PENDENTE",
    )
    decidido_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    motivo_rejeicao: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
