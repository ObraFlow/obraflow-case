from fastapi.testclient import TestClient


def test_salvar_alcadas_e_preservar_apos_erro(
    client: TestClient,
) -> None:
    obra = client.post(
        "/api/obras",
        json={"nome_obra": "Residencial Horizonte"},
    ).json()
    amanda = client.post(
        "/api/usuarios",
        json={"nome_usuario": "Amanda"},
    ).json()
    joao = client.post(
        "/api/usuarios",
        json={"nome_usuario": "João"},
    ).json()

    url = f"/api/obras/{obra['id_obra']}/alcadas"

    configuracao = {
        "faixas": [
            {
                "limite_superior_centavos": 1000000,
                "aprovadores": [amanda["id_usuario"]],
            },
            {
                "limite_superior_centavos": None,
                "aprovadores": [
                    amanda["id_usuario"],
                    joao["id_usuario"],
                ],
            },
        ]
    }

    resposta = client.put(url, json=configuracao)
    assert resposta.status_code == 200

    resposta = client.get(url)
    assert resposta.status_code == 200
    assert resposta.json() == configuracao

    configuracao_invalida = {
        "faixas": [
            {
                "limite_superior_centavos": 1000000,
                "aprovadores": [amanda["id_usuario"]],
            },
            {
                "limite_superior_centavos": 1000000,
                "aprovadores": [joao["id_usuario"]],
            },
        ]
    }

    resposta = client.put(url, json=configuracao_invalida)
    assert resposta.status_code == 422
    assert client.get(url).json() == configuracao


def test_editar_e_remover_alcadas(client: TestClient) -> None:
    obra = client.post(
        "/api/obras",
        json={"nome_obra": "Reforma da Escola"},
    ).json()
    amanda = client.post(
        "/api/usuarios",
        json={"nome_usuario": "Amanda"},
    ).json()
    joao = client.post(
        "/api/usuarios",
        json={"nome_usuario": "João"},
    ).json()

    url = f"/api/obras/{obra['id_obra']}/alcadas"

    inicial = {
        "faixas": [
            {
                "limite_superior_centavos": 1000000,
                "aprovadores": [amanda["id_usuario"]],
            },
            {
                "limite_superior_centavos": None,
                "aprovadores": [
                    amanda["id_usuario"],
                    joao["id_usuario"],
                ],
            },
        ]
    }
    assert client.put(url, json=inicial).status_code == 200

    editada = {
        "faixas": [
            {
                "limite_superior_centavos": None,
                "aprovadores": [
                    joao["id_usuario"],
                    amanda["id_usuario"],
                ],
            }
        ]
    }
    resposta = client.put(url, json=editada)

    assert resposta.status_code == 200
    assert client.get(url).json() == editada

    resposta = client.put(url, json={"faixas": []})

    assert resposta.status_code == 200
    assert client.get(url).json() == {"faixas": []}
