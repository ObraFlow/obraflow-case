import pytest
from fastapi.testclient import TestClient


def test_create_obra(client: TestClient) -> None:
    response = client.post(
        "/api/obras",
        json={"nome_obra": "  Residencial Horizonte  "},
    )

    assert response.status_code == 201
    assert response.json()["nome_obra"] == "Residencial Horizonte"
    assert isinstance(response.json()["id_obra"], int)


def test_list_obras(client: TestClient) -> None:
    for nome in ["Residencial Horizonte", "Reforma da Escola"]:
        response = client.post(
            "/api/obras",
            json={"nome_obra": nome},
        )
        assert response.status_code == 201

    response = client.get("/api/obras")

    assert response.status_code == 200

    nomes = {obra["nome_obra"] for obra in response.json()}

    assert nomes == {"Residencial Horizonte", "Reforma da Escola"}


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"nome_obra": ""},
        {"nome_obra": "   "},
        {"nome_obra": "a" * 201},
    ],
)
def test_create_obra_rejects_invalid_data(
    client: TestClient,
    payload: dict[str, str],
) -> None:
    response = client.post("/api/obras", json=payload)

    assert response.status_code == 422
