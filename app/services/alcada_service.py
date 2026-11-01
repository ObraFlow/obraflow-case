from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.models import Obra, RegraAlcada, RegraAprovador, Usuario
from app.schemas.alcada import AlcadasUpdate, FaixaAlcadaInput


def validar_faixas(dados: AlcadasUpdate) -> None:
    limites = [faixa.limite_superior_centavos for faixa in dados.faixas]

    if limites.count(None) > 1:
        raise ValueError("Só pode existir uma faixa sem teto")

    if None in limites and limites[-1] is not None:
        raise ValueError("A faixa sem teto deve ser a última")

    limites_com_teto = [limite for limite in limites if limite is not None]

    if limites_com_teto != sorted(set(limites_com_teto)):
        raise ValueError("Os limites devem ser diferentes e estar em ordem crescente")


def salvar_alcadas(
    session: Session,
    id_obra: int,
    dados: AlcadasUpdate,
) -> None:
    validar_faixas(dados)

    try:
        session.execute(text("BEGIN IMMEDIATE"))

        if session.get(Obra, id_obra) is None:
            raise LookupError(f"Obra {id_obra} não encontrada")

        ids_usuarios = {
            id_usuario for faixa in dados.faixas for id_usuario in faixa.aprovadores
        }

        if ids_usuarios:
            encontrados = set(
                session.scalars(
                    select(Usuario.id_usuario).where(
                        Usuario.id_usuario.in_(ids_usuarios)
                    )
                )
            )
            faltantes = ids_usuarios - encontrados

            if faltantes:
                raise ValueError(f"Usuários não encontrados: {sorted(faltantes)}")

        session.execute(delete(RegraAlcada).where(RegraAlcada.id_obra == id_obra))

        for faixa in dados.faixas:
            regra = RegraAlcada(
                id_obra=id_obra,
                limite_superior_centavos=faixa.limite_superior_centavos,
            )
            session.add(regra)
            session.flush()

            for ordem, id_usuario in enumerate(faixa.aprovadores, start=1):
                session.add(
                    RegraAprovador(
                        id_regra=regra.id_regra,
                        id_usuario=id_usuario,
                        ordem=ordem,
                    )
                )

        session.commit()
    except Exception:
        session.rollback()
        raise


def listar_alcadas(
    session: Session,
    id_obra: int,
) -> AlcadasUpdate:
    if session.get(Obra, id_obra) is None:
        raise LookupError(f"Obra {id_obra} não encontrada")

    regras = session.scalars(
        select(RegraAlcada)
        .where(RegraAlcada.id_obra == id_obra)
        .order_by(
            RegraAlcada.limite_superior_centavos.is_(None),
            RegraAlcada.limite_superior_centavos,
        )
    )

    faixas: list[FaixaAlcadaInput] = []

    for regra in regras:
        aprovadores = list(
            session.scalars(
                select(RegraAprovador.id_usuario)
                .where(RegraAprovador.id_regra == regra.id_regra)
                .order_by(RegraAprovador.ordem)
            )
        )

        faixas.append(
            FaixaAlcadaInput(
                limite_superior_centavos=regra.limite_superior_centavos,
                aprovadores=aprovadores,
            )
        )

    return AlcadasUpdate(faixas=faixas)
