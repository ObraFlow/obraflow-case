import pytest
from fastapi.testclient import TestClient


def test_create_usuario(client: TestClient) -> None:
    response = client.post(
        "/api/usuarios",
        json={"nome_usuario": "  Amanda  "},
    )

    assert response.status_code == 201
    assert response.json()["nome_usuario"] == "Amanda"
    assert isinstance(response.json()["id_usuario"], int)


def test_list_usuarios(client: TestClient) -> None:
    ids = []

    for nome in ["Amanda", "João"]:
        response = client.post(
            "/api/usuarios",
            json={"nome_usuario": nome},
        )
        assert response.status_code == 201
        ids.append(response.json()["id_usuario"])

    assert ids[0] != ids[1]

    response = client.get("/api/usuarios")

    assert response.status_code == 200

    nomes = {usuario["nome_usuario"] for usuario in response.json()}
    assert nomes == {"Amanda", "João"}


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"nome_usuario": ""},
        {"nome_usuario": "   "},
        {"nome_usuario": "a" * 151},
    ],
)
def test_create_usuario_rejects_invalid_data(
    client: TestClient,
    payload: dict[str, str],
) -> None:
    response = client.post("/api/usuarios", json=payload)

    assert response.status_code == 422
