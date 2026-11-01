from datetime import date
from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal, engine
from app.models import Base, Fornecedor, Obra, Usuario
from app.schemas.alcada import AlcadasUpdate
from app.schemas.pedido import DecisaoPedidoInput, ItemPedidoCreate, PedidoCreate
from app.services.alcada_service import salvar_alcadas
from app.services.pedido_service import criar_pedido, decidir_pedido


def criar_pedido_demo(
    id_obra: int,
    id_fornecedor: int,
    rotulo: str,
    descricao: str,
    preco: str,
) -> int:
    with SessionLocal() as session:
        pedido = criar_pedido(
            session,
            PedidoCreate(
                id_obra=id_obra,
                id_fornecedor=id_fornecedor,
                data_pedido=date.today(),
                observacoes=f"[DEMO] {rotulo}",
                itens=[
                    ItemPedidoCreate(
                        descricao=descricao,
                        quantidade=Decimal(1),
                        unidade="un",
                        preco_unitario=Decimal(preco),
                    )
                ],
            ),
        )
        return pedido.id_pedido


def main() -> None:
    Base.metadata.create_all(engine)

    with SessionLocal() as session:
        existente = session.scalar(
            select(Obra.id_obra).where(
                Obra.nome_obra == "Residencial das Palmeiras (demo)"
            )
        )
        if existente is not None:
            print("Dados de demonstração já foram criados")
            return

        obra1 = Obra(nome_obra="Residencial das Palmeiras (demo)")
        obra2 = Obra(nome_obra="Reforma da Escola (demo)")
        fornecedor = Fornecedor(
            nome_fornecedor="Materiais Modelo (demo)",
            cnpj="00000000000099",
            rua="Rua Central",
            cidade="Salvador",
        )
        ana = Usuario(nome_usuario="Ana Demo")
        bruno = Usuario(nome_usuario="Bruno Demo")

        session.add_all([obra1, obra2, fornecedor, ana, bruno])
        session.flush()

        id_obra1 = obra1.id_obra
        id_obra2 = obra2.id_obra
        id_fornecedor = fornecedor.id_fornecedor
        id_ana = ana.id_usuario
        id_bruno = bruno.id_usuario

        session.commit()

    with SessionLocal() as session:
        salvar_alcadas(
            session,
            id_obra1,
            AlcadasUpdate.model_validate(
                {
                    "faixas": [
                        {
                            "limite_superior_centavos": 100000,
                            "aprovadores": [id_ana],
                        },
                        {
                            "limite_superior_centavos": None,
                            "aprovadores": [id_ana, id_bruno],
                        },
                    ]
                }
            ),
        )

    with SessionLocal() as session:
        salvar_alcadas(
            session,
            id_obra2,
            AlcadasUpdate.model_validate(
                {
                    "faixas": [
                        {
                            "limite_superior_centavos": None,
                            "aprovadores": [id_bruno],
                        }
                    ]
                }
            ),
        )

    id_pendente = criar_pedido_demo(
        id_obra1, id_fornecedor, "Pendente", "Cimento", "450.00"
    )
    id_aprovado = criar_pedido_demo(
        id_obra1, id_fornecedor, "Aprovado", "Betoneira", "1200.00"
    )
    id_rejeitado = criar_pedido_demo(
        id_obra2, id_fornecedor, "Rejeitado", "Pisos", "700.00"
    )

    with SessionLocal() as session:
        decidir_pedido(
            session,
            id_aprovado,
            DecisaoPedidoInput(id_usuario=id_ana, acao="APROVAR"),
        )
    with SessionLocal() as session:
        decidir_pedido(
            session,
            id_aprovado,
            DecisaoPedidoInput(id_usuario=id_bruno, acao="APROVAR"),
        )
    with SessionLocal() as session:
        decidir_pedido(
            session,
            id_rejeitado,
            DecisaoPedidoInput(
                id_usuario=id_bruno,
                acao="REJEITAR",
                motivo="Material indisponível para a obra",
            ),
        )

    print(
        f"Pedidos demo: pendente={id_pendente}, "
        f"aprovado={id_aprovado}, rejeitado={id_rejeitado}"
    )


if __name__ == "__main__":
    main()
