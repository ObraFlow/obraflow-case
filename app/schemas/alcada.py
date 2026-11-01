from pydantic import BaseModel, Field, PositiveInt, field_validator


class FaixaAlcadaInput(BaseModel):
    limite_superior_centavos: int | None = Field(default=None, ge=0)
    aprovadores: list[PositiveInt] = Field(min_length=1)

    @field_validator("aprovadores")
    @classmethod
    def impedir_repeticao(cls, ids: list[int]) -> list[int]:
        if len(ids) != len(set(ids)):
            raise ValueError("Cada pessoa deve aparecer uma vez na faixa")
        return ids


class AlcadasUpdate(BaseModel):
    faixas: list[FaixaAlcadaInput]
