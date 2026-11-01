from pydantic import BaseModel, ConfigDict, Field


class UsuarioBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nome_usuario: str = Field(min_length=1, max_length=150)


class UsuarioCreate(UsuarioBase):
    pass


class UsuarioResponse(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
