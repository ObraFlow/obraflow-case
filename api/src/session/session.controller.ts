import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import {
  readSessionUserId,
  SESSION_COOKIE,
  sessionCookieOptions,
} from './session-cookie.js';

const userSelect = { id: true, name: true, email: true, role: true };

/**
 * Simulated login: the user picks who they are and the server stores that id
 * in a signed cookie. There is no password because the case has no auth; in
 * production this would be a real login issuing the same kind of session.
 * All three routes are idempotent: repeating them leaves the same state.
 */
@ApiTags('session')
@Controller('session')
export class SessionController {
  constructor(private readonly prisma: PrismaService) {}

  /** Logs in as the given user: sets the signed session cookie. */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiNotFoundResponse({ description: 'User not found.' })
  async create(
    @Body() dto: CreateSessionDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: userSelect,
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    response.cookie(SESSION_COOKIE, user.id, sessionCookieOptions());
    return { user };
  }

  /** Who is logged in; user is null when no one was selected yet. */
  @Get()
  async current(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = readSessionUserId(request);
    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: userSelect,
        })
      : null;

    if (user) {
      // Sliding expiration: every visit pushes the expiry forward.
      response.cookie(SESSION_COOKIE, user.id, sessionCookieOptions());
    } else if (request.signedCookies?.[SESSION_COOKIE] !== undefined) {
      // Tampered cookie or deleted user: drop the stale cookie.
      response.clearCookie(SESSION_COOKIE, { path: '/' });
    }
    return { user };
  }

  /** Logs out: clears the session cookie. */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, { path: '/' });
  }
}
