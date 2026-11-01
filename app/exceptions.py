class CnpjAlreadyExistsError(Exception):
    def __init__(self, cnpj: str) -> None:
        super().__init__(
            f"Fornecedor com CNPJ {cnpj} ja cadastrado",
        )
