import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { readSessionUserId } from './session-cookie.js';

/**
 * Id of the user acting on the request, taken from the session cookie.
 * Responds 401 when no user was selected. Services still check that the user
 * is allowed to do the action (e.g. is the current approver).
 */
export const ActorId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = readSessionUserId(request);
    if (!userId) {
      throw new UnauthorizedException('Selecione um usuário para continuar.');
    }
    return userId;
  },
);
