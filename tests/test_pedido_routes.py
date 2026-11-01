from fastapi.testclient import TestClient


def test_fluxo_de_pedidos(client: TestClient) -> None:
    obra = client.post("/api/obras", json={"nome_obra": "Obra de teste"}).json()
    fornecedor = client.post(
        "/api/fornecedores",
        json={
            "nome_fornecedor": "Fornecedor de teste",
            "cnpj": "00000000000001",
            "rua": "Rua A",
            "cidade": "Salvador",
        },
    ).json()
    amanda = client.post("/api/usuarios", json={"nome_usuario": "Amanda"}).json()
    joao = client.post("/api/usuarios", json={"nome_usuario": "João"}).json()

    id_obra = obra["id_obra"]
    id_fornecedor = fornecedor["id_fornecedor"]
    id_amanda = amanda["id_usuario"]
    id_joao = joao["id_usuario"]

    url_alcadas = f"/api/obras/{id_obra}/alcadas"
    resposta = client.put(
        url_alcadas,
        json={
            "faixas": [
                {
                    "limite_superior_centavos": 1000000,
                    "aprovadores": [id_amanda],
                },
                {
                    "limite_superior_centavos": None,
                    "aprovadores": [id_amanda, id_joao],
                },
            ]
        },
    )
    assert resposta.status_code == 200

    resposta = client.post(
        "/api/pedidos",
        json={
            "id_obra": id_obra,
            "id_fornecedor": id_fornecedor,
            "data_pedido": "2026-10-27",
            "itens": [
                {
                    "descricao": "Equipamento",
                    "quantidade": "1",
                    "unidade": "un",
                    "preco_unitario": "10000.01",
                }
            ],
        },
    )
    assert resposta.status_code == 201
    assert resposta.json()["total_centavos"] == 1000001
    id_pedido_alto = resposta.json()["id_pedido"]
    url_alto = f"/api/pedidos/{id_pedido_alto}"

    etapas = client.get(url_alto).json()["etapas"]
    assert [etapa["id_usuario"] for etapa in etapas] == [id_amanda, id_joao]

    resposta = client.post(
        f"{url_alto}/decisoes",
        json={"id_usuario": id_joao, "acao": "APROVAR"},
    )
    assert resposta.status_code == 403
    assert client.get(url_alto).json()["pedido"]["etapa_atual"] == 1

    resposta = client.post(
        f"{url_alto}/decisoes",
        json={"id_usuario": id_amanda, "acao": "APROVAR"},
    )
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "PENDENTE"
    assert resposta.json()["etapa_atual"] == 2

    resposta = client.post(
        f"{url_alto}/decisoes",
        json={"id_usuario": id_joao, "acao": "APROVAR"},
    )
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "APROVADO"
    assert resposta.json()["etapa_atual"] is None

    etapas = client.get(url_alto).json()["etapas"]
    assert [etapa["status"] for etapa in etapas] == [
        "APROVADO",
        "APROVADO",
    ]
    assert all(etapa["decidido_em"] for etapa in etapas)

    resposta = client.post(
        "/api/pedidos",
        json={
            "id_obra": id_obra,
            "id_fornecedor": id_fornecedor,
            "data_pedido": "2026-10-27",
            "itens": [
                {
                    "descricao": "Tinta",
                    "quantidade": "1.5",
                    "unidade": "l",
                    "preco_unitario": "20.00",
                },
                {
                    "descricao": "Pincel",
                    "quantidade": "2",
                    "unidade": "un",
                    "preco_unitario": "15.50",
                },
            ],
        },
    )
    assert resposta.status_code == 201
    assert resposta.json()["total_centavos"] == 6100
    url_baixo = f"/api/pedidos/{resposta.json()['id_pedido']}"

    detalhe = client.get(url_baixo).json()
    assert [item["total_centavos"] for item in detalhe["itens"]] == [
        3000,
        3100,
    ]
    assert [etapa["id_usuario"] for etapa in detalhe["etapas"]] == [id_amanda]

    resposta = client.post(
        f"{url_baixo}/decisoes",
        json={"id_usuario": id_amanda, "acao": "REJEITAR"},
    )
    assert resposta.status_code == 422
    assert client.get(url_baixo).json()["pedido"]["status"] == "PENDENTE"

    resposta = client.post(
        f"{url_baixo}/decisoes",
        json={
            "id_usuario": id_amanda,
            "acao": "REJEITAR",
            "motivo": "Material fora da especificação",
        },
    )
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "REJEITADO"

    detalhe = client.get(url_baixo).json()
    assert detalhe["etapas"][0]["status"] == "REJEITADO"
    assert detalhe["etapas"][0]["motivo_rejeicao"] == ("Material fora da especificação")
    assert detalhe["etapas"][0]["decidido_em"] is not None
