from pydantic import BaseModel, ConfigDict, Field


class FornecedorBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nome_fornecedor: str = Field(
        min_length=1,
        max_length=200,
    )
    cnpj: str = Field(
        pattern=r"^[0-9]{14}$",
    )
    rua: str = Field(
        min_length=1,
        max_length=200,
    )
    cidade: str = Field(
        min_length=1,
        max_length=100,
    )


class FornecedorCreate(FornecedorBase):
    pass


class FornecedorResponse(FornecedorBase):
    model_config = ConfigDict(from_attributes=True)

    id_fornecedor: int
