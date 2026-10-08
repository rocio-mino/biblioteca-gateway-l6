import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { verificar, tieneScope, estaEnGrupo } from './auth/verificador';
const PRESTAMOS_URL = process.env.PRESTAMOS_URL ?? 'http://localhost:3002';
/**
 * La pieza gemela de `libros.controller.ts`.
 *
 * Tramo 7.4 de L3, "Lo haces tú": protegida igual que libros, exigiendo las dos
 * cosas — el scope `biblioteca/libros.leer` **y** que el usuario esté en el
 * grupo `bibliotecarios`. `lector@biblioteca.test` (bibliotecarios) entra con
 * 200; `invitado@biblioteca.test` (lectores) recibe 403.
 */
@Controller('v1/prestamos')
export class PrestamosController {
  @Get()
  async listar(
    @Headers('authorization') authorization?: string,
  ): Promise<unknown> {
    // ── autenticación: ¿este token es de fiar? ──
    let claims;
    try {
      claims = await verificar(authorization);
    } catch (e) {
      throw new UnauthorizedException((e as Error).message);   // → 401
    }

    // ── autorización: scope y grupo, las dos cosas ──
    if (!tieneScope(claims, 'biblioteca/libros.leer')) {
      throw new ForbiddenException('te falta el permiso biblioteca/libros.leer');  // → 403
    }
    if (!estaEnGrupo(claims, 'bibliotecarios')) {
      throw new ForbiddenException('te falta el grupo bibliotecarios');  // → 403
    }

    const respuesta = await fetch(`${PRESTAMOS_URL}/prestamos`);
    return respuesta.json();
  }
}
