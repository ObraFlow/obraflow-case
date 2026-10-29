import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

/** ParseUUIDPipe with the error in Portuguese, like the rest of the API. */
export const ParseUuid = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException('Identificador inválido na URL (UUID esperado).'),
});
