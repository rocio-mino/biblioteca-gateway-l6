import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { verificar, tieneScope } from './auth/verificador';
const LIBROS_URL = process.env.LIBROS_URL ?? 'http://localhost:3001';
/**
 * La ruta pública del catálogo.
 *
 * El `v1` de la ruta es versionado, no decoración: el día que `copias` pase a
 * ser un objeto con `total` y `disponibles`, eso es `v2` y quien usaba `v1`
 * sigue funcionando.
 *
 * Y fíjate en lo que el cliente nunca supo: que existe un puerto 3001.
 */
@Controller('v1/libros')
export class LibrosController {
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

    // ── autorización: ¿y le alcanza para esto? ──
    if (!tieneScope(claims, 'biblioteca/libros.leer')) {
      throw new ForbiddenException('te falta el permiso biblioteca/libros.leer');  // → 403
    }

    const respuesta = await fetch(`${LIBROS_URL}/libros`);
    return respuesta.json();
  }

  // Prueba 4 del tramo 7.3 de L3: el app client no puede pedir este scope, así
  // que ningún token que consigas lo va a traer. Token válido y aun así 403.
  @Post()
  async crear(
    @Headers('authorization') authorization?: string,
  ): Promise<unknown> {
    let claims;
    try {
      claims = await verificar(authorization);
    } catch (e) {
      throw new UnauthorizedException((e as Error).message);
    }

    if (!tieneScope(claims, 'biblioteca/libros.escribir')) {
      throw new ForbiddenException('te falta el permiso biblioteca/libros.escribir');
    }

    return { ok: true };
  }
}
