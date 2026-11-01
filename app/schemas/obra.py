from pydantic import BaseModel, ConfigDict, Field


class ObraBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nome_obra: str = Field(min_length=1, max_length=200)


class ObraCreate(ObraBase):
    pass


class ObraResponse(ObraBase):
    model_config = ConfigDict(from_attributes=True)

    id_obra: int
