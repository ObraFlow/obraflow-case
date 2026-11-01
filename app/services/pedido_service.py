from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.orm import Session

from app.models import (
    EtapaAprovacao,
    Fornecedor,
    ItemPedido,
    Obra,
    Pedido,
    RegraAlcada,
    RegraAprovador,
    Usuario,
)
from app.schemas.pedido import (
    DecisaoPedidoInput,
    EtapaAprovacaoResponse,
    EtapaResumoResponse,
    ItemPedidoCreate,
    ItemPedidoResponse,
    PedidoCreate,
    PedidoDetalheResponse,
    PedidoListaResponse,
    PedidoResponse,
)


def calcular_item(item: ItemPedidoCreate) -> tuple[int, int, int]:
    quantidade_milesimos = int(item.quantidade * 1000)
    preco_unitario_centavos = int(item.preco_unitario * 100)

    total_centavos = int(
        (item.quantidade * item.preco_unitario * 100).quantize(
            Decimal(1),
            rounding=ROUND_HALF_UP,
        )
    )

    return quantidade_milesimos, preco_unitario_centavos, total_centavos


def calcular_total_pedido(dados: PedidoCreate) -> int:
    return sum(calcular_item(item)[2] for item in dados.itens)


def selecionar_regra(
    session: Session,
    id_obra: int,
    total_centavos: int,
) -> RegraAlcada:
    regra = session.scalar(
        select(RegraAlcada)
        .where(
            RegraAlcada.id_obra == id_obra,
            or_(
                RegraAlcada.limite_superior_centavos >= total_centavos,
                RegraAlcada.limite_superior_centavos.is_(None),
            ),
        )
        .order_by(
            RegraAlcada.limite_superior_centavos.is_(None),
            RegraAlcada.limite_superior_centavos,
        )
        .limit(1)
    )

    if regra is None:
        raise ValueError("Esta obra não possui faixa de aprovação para esse valor")

    return regra


def criar_pedido(session: Session, dados: PedidoCreate) -> Pedido:
    total_centavos = calcular_total_pedido(dados)

    try:
        session.execute(text("BEGIN IMMEDIATE"))

        if session.get(Obra, dados.id_obra) is None:
            raise LookupError(f"Obra {dados.id_obra} não encontrada")

        if session.get(Fornecedor, dados.id_fornecedor) is None:
            raise LookupError(f"Fornecedor {dados.id_fornecedor} não encontrado")

        regra = selecionar_regra(session, dados.id_obra, total_centavos)

        aprovadores = session.execute(
            select(RegraAprovador, Usuario)
            .join(Usuario, Usuario.id_usuario == RegraAprovador.id_usuario)
            .where(RegraAprovador.id_regra == regra.id_regra)
            .order_by(RegraAprovador.ordem)
        ).all()

        if not aprovadores:
            raise ValueError("A faixa escolhida não possui aprovadores")

        pedido = Pedido(
            id_obra=dados.id_obra,
            id_fornecedor=dados.id_fornecedor,
            data_pedido=dados.data_pedido,
            observacoes=dados.observacoes,
            total_centavos=total_centavos,
            status="PENDENTE",
            etapa_atual=1,
        )
        session.add(pedido)
        session.flush()

        for item in dados.itens:
            quantidade, preco, total_item = calcular_item(item)
            session.add(
                ItemPedido(
                    id_pedido=pedido.id_pedido,
                    descricao=item.descricao,
                    quantidade_milesimos=quantidade,
                    unidade=item.unidade,
                    preco_unitario_centavos=preco,
                    total_centavos=total_item,
                )
            )

        for aprovador, usuario in aprovadores:
            session.add(
                EtapaAprovacao(
                    id_pedido=pedido.id_pedido,
                    id_usuario=usuario.id_usuario,
                    nome_aprovador=usuario.nome_usuario,
                    ordem=aprovador.ordem,
                    status="PENDENTE",
                )
            )

        session.commit()
        return pedido
    except Exception:
        session.rollback()
        raise


def detalhar_pedido(session: Session, id_pedido: int) -> PedidoDetalheResponse:
    pedido = session.get(Pedido, id_pedido)

    if pedido is None:
        raise LookupError(f"Pedido {id_pedido} não encontrado")

    itens = session.scalars(
        select(ItemPedido)
        .where(ItemPedido.id_pedido == id_pedido)
        .order_by(ItemPedido.id_item_pedido)
    ).all()

    etapas = session.scalars(
        select(EtapaAprovacao)
        .where(EtapaAprovacao.id_pedido == id_pedido)
        .order_by(EtapaAprovacao.ordem)
    ).all()

    return PedidoDetalheResponse(
        pedido=PedidoResponse.model_validate(pedido),
        itens=[ItemPedidoResponse.model_validate(item) for item in itens],
        etapas=[EtapaAprovacaoResponse.model_validate(etapa) for etapa in etapas],
    )


def decidir_pedido(
    session: Session,
    id_pedido: int,
    dados: DecisaoPedidoInput,
) -> Pedido:
    try:
        session.execute(text("BEGIN IMMEDIATE"))

        pedido = session.get(Pedido, id_pedido)
        if pedido is None:
            raise LookupError(f"Pedido {id_pedido} não encontrado")

        if pedido.status != "PENDENTE" or pedido.etapa_atual is None:
            raise ValueError("Pedido não está aguardando aprovação")

        etapa = session.scalar(
            select(EtapaAprovacao).where(
                EtapaAprovacao.id_pedido == id_pedido,
                EtapaAprovacao.ordem == pedido.etapa_atual,
            )
        )
        if etapa is None or etapa.status != "PENDENTE":
            raise ValueError("Etapa atual não está disponível")

        if etapa.id_usuario != dados.id_usuario:
            raise PermissionError(f"Agora é a vez de {etapa.nome_aprovador}")

        if dados.acao == "REJEITAR" and not dados.motivo:
            raise ValueError("Informe o motivo da rejeição")

        etapa.decidido_em = datetime.now(UTC)

        if dados.acao == "REJEITAR":
            etapa.status = "REJEITADO"
            etapa.motivo_rejeicao = dados.motivo
            pedido.status = "REJEITADO"
            pedido.etapa_atual = None
        else:
            etapa.status = "APROVADO"

            proxima_ordem = session.scalar(
                select(EtapaAprovacao.ordem)
                .where(
                    EtapaAprovacao.id_pedido == id_pedido,
                    EtapaAprovacao.ordem > etapa.ordem,
                )
                .order_by(EtapaAprovacao.ordem)
                .limit(1)
            )

            if proxima_ordem is None:
                pedido.status = "APROVADO"
                pedido.etapa_atual = None
            else:
                pedido.etapa_atual = proxima_ordem

        session.commit()
        return pedido
    except Exception:
        session.rollback()
        raise


def listar_pedidos(session: Session) -> list[PedidoListaResponse]:
    linhas = session.execute(
        select(
            Pedido,
            Obra.nome_obra,
            Fornecedor.nome_fornecedor,
            EtapaAprovacao.id_usuario,
            EtapaAprovacao.nome_aprovador,
        )
        .join(Obra, Obra.id_obra == Pedido.id_obra)
        .join(Fornecedor, Fornecedor.id_fornecedor == Pedido.id_fornecedor)
        .outerjoin(
            EtapaAprovacao,
            and_(
                EtapaAprovacao.id_pedido == Pedido.id_pedido,
                EtapaAprovacao.ordem == Pedido.etapa_atual,
            ),
        )
        .order_by(Pedido.id_pedido.desc())
    ).all()
    contagens = dict(
        session.execute(
            select(
                ItemPedido.id_pedido,
                func.count(ItemPedido.id_item_pedido),
            ).group_by(ItemPedido.id_pedido)
        ).all()
    )
    etapas_por_pedido: dict[int, list[EtapaResumoResponse]] = {}

    linhas_etapas = session.execute(
        select(
            EtapaAprovacao.id_pedido,
            EtapaAprovacao.ordem,
            EtapaAprovacao.nome_aprovador,
            EtapaAprovacao.status,
        ).order_by(
            EtapaAprovacao.id_pedido,
            EtapaAprovacao.ordem,
        )
    )

    for id_pedido, ordem, nome_aprovador, status in linhas_etapas:
        etapas_por_pedido.setdefault(id_pedido, []).append(
            EtapaResumoResponse(
                ordem=ordem,
                nome_aprovador=nome_aprovador,
                status=status,
            )
        )
    return [
        PedidoListaResponse(
            **PedidoResponse.model_validate(pedido).model_dump(),
            nome_obra=nome_obra,
            nome_fornecedor=nome_fornecedor,
            quantidade_itens=contagens.get(pedido.id_pedido, 0),
            id_aprovador_atual=id_usuario,
            nome_aprovador_atual=nome_aprovador,
            etapas=etapas_por_pedido.get(pedido.id_pedido, []),
        )
        for pedido, nome_obra, nome_fornecedor, id_usuario, nome_aprovador in linhas
    ]
