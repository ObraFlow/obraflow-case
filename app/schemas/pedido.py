from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, PositiveInt


class ItemPedidoCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    descricao: str = Field(min_length=1)
    quantidade: Decimal = Field(
        gt=0,
        max_digits=9,
        decimal_places=3,
    )
    unidade: str = Field(min_length=1, max_length=20)
    preco_unitario: Decimal = Field(
        ge=0,
        max_digits=10,
        decimal_places=2,
    )


class PedidoCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    id_obra: PositiveInt
    id_fornecedor: PositiveInt
    data_pedido: date
    observacoes: str | None = Field(default=None, max_length=2000)
    itens: list[ItemPedidoCreate] = Field(min_length=1)


class PedidoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pedido: int
    id_obra: int
    id_fornecedor: int
    data_pedido: date
    observacoes: str | None
    total_centavos: int
    status: str
    etapa_atual: int | None


class EtapaResumoResponse(BaseModel):
    ordem: int
    nome_aprovador: str
    status: str


class PedidoListaResponse(PedidoResponse):
    nome_obra: str
    nome_fornecedor: str
    id_aprovador_atual: int | None
    nome_aprovador_atual: str | None
    quantidade_itens: int
    etapas: list[EtapaResumoResponse]


class ItemPedidoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_item_pedido: int
    descricao: str
    quantidade_milesimos: int
    unidade: str
    preco_unitario_centavos: int
    total_centavos: int


class EtapaAprovacaoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_etapa: int
    id_usuario: int
    nome_aprovador: str
    ordem: int
    status: str
    decidido_em: datetime | None
    motivo_rejeicao: str | None


class PedidoDetalheResponse(BaseModel):
    pedido: PedidoResponse
    itens: list[ItemPedidoResponse]
    etapas: list[EtapaAprovacaoResponse]


class DecisaoPedidoInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    id_usuario: PositiveInt
    acao: Literal["APROVAR", "REJEITAR"]
    motivo: str | None = Field(default=None, max_length=1000)
