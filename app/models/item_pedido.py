from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ItemPedido(Base):
    __tablename__ = "item_pedido"

    __table_args__ = (
        CheckConstraint(
            "quantidade_milesimos > 0",
            name="ck_item_pedido_quantidade",
        ),
        CheckConstraint(
            "preco_unitario_centavos >= 0",
            name="ck_item_pedido_preco",
        ),
        CheckConstraint(
            "total_centavos >= 0",
            name="ck_item_pedido_total",
        ),
    )

    id_item_pedido: Mapped[int] = mapped_column(primary_key=True)
    id_pedido: Mapped[int] = mapped_column(
        ForeignKey("pedido.id_pedido", ondelete="RESTRICT"),
        nullable=False,
    )
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    quantidade_milesimos: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    unidade: Mapped[str] = mapped_column(String(20), nullable=False)
    preco_unitario_centavos: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    total_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
