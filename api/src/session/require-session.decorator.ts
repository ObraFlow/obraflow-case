import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { readSessionUserId } from './session-cookie.js';

/** Responds 401 when no user was selected (same rule and message as @ActorId). */
@Injectable()
class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!readSessionUserId(request)) {
      throw new UnauthorizedException('Selecione um usuário para continuar.');
    }
    return true;
  }
}

/**
 * For routes that change data but do not need to know who the user is (rules,
 * sites, users, suppliers): nobody can change them without picking a user.
 * Routes that use the user id take @ActorId() instead, which also responds 401.
 */
export function RequireSession() {
  return applyDecorators(
    UseGuards(SessionGuard),
    ApiCookieAuth(),
    ApiUnauthorizedResponse({ description: 'No user selected.' }),
  );
}
