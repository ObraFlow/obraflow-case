from fastapi.testclient import TestClient


def test_create_fornecedor(client: TestClient) -> None:
    response = client.post(
        "/api/fornecedores",
        json={
            "nome_fornecedor": "Fornecedor do teste",
            "cnpj": "00000000000001",
            "rua": "Rua Central",
            "cidade": "Salvador",
        },
    )

    assert response.status_code == 201
    assert response.json()["nome_fornecedor"] == "Fornecedor do teste"
    assert response.json()["cnpj"] == "00000000000001"
    assert isinstance(response.json()["id_fornecedor"], int)


def test_list_fornecedores(client: TestClient) -> None:
    client.post(
        "/api/fornecedores",
        json={
            "nome_fornecedor": "Fornecedor A",
            "cnpj": "00000000000002",
            "rua": "Rua A",
            "cidade": "Salvador",
        },
    )
    client.post(
        "/api/fornecedores",
        json={
            "nome_fornecedor": "Fornecedor B",
            "cnpj": "00000000000003",
            "rua": "Rua B",
            "cidade": "Recife",
        },
    )

    response = client.get("/api/fornecedores")

    assert response.status_code == 200

    nomes = {fornecedor["nome_fornecedor"] for fornecedor in response.json()}

    assert "Fornecedor A" in nomes
    assert "Fornecedor B" in nomes


def test_create_fornecedor_rejects_invalid_cnpj(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/fornecedores",
        json={
            "nome_fornecedor": "Fornecedor invalido",
            "cnpj": "123",
            "rua": "Rua Central",
            "cidade": "Salvador",
        },
    )

    assert response.status_code == 422


def test_create_fornecedor_rejects_duplicate_cnpj(
    client: TestClient,
) -> None:
    payload = {
        "nome_fornecedor": "Fornecedor duplicado",
        "cnpj": "00000000000004",
        "rua": "Rua Central",
        "cidade": "Salvador",
    }

    first_response = client.post(
        "/api/fornecedores",
        json=payload,
    )
    second_response = client.post(
        "/api/fornecedores",
        json=payload,
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json() == {
        "detail": ("Fornecedor com CNPJ 00000000000004 ja cadastrado"),
    }
