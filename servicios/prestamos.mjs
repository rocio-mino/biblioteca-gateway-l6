import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { connect } from 'amqplib';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { EXCHANGES, ROUTING_KEYS, declararTopologia } from './mensajeria/topologia.mjs';

const ARCHIVO = new URL('../datos/prestamos.json', import.meta.url);
const leer = () => JSON.parse(readFileSync(ARCHIVO, 'utf8'));
const guardar = (d) => writeFileSync(ARCHIVO, JSON.stringify(d, null, 2), 'utf8');

const LATENCIA_SIMULADA_MS = 300;
const RABBITMQ_URL = process.env.RABBITMQ_URL;                        // de servicios/.env
const EMISOR = process.env.COGNITO_ISSUER;                            // de servicios/.env
if (!RABBITMQ_URL || !EMISOR) {
  throw new Error('faltan RABBITMQ_URL o COGNITO_ISSUER: arranca con --env-file=servicios/.env');
}
const jwks = createRemoteJWKSet(new URL(`${EMISOR}/.well-known/jwks.json`));

const json = (res, codigo, cuerpo) => {
  res.writeHead(codigo, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(cuerpo));
};

const leerCuerpo = async (peticion) => {
  const trozos = [];
  for await (const t of peticion) trozos.push(t);
  return JSON.parse(Buffer.concat(trozos).toString() || '{}');
};

// 1 · La identidad sale del token, no del cuerpo. Sin token, 401.
const subDelToken = async (cabecera) => {
  if (!cabecera?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(cabecera.slice(7), jwks, { issuer: EMISOR });
    return payload.sub ?? null;
  } catch (error) {
    console.error('[prestamos] error validando token:', error);
    return null;
  }
};

// 2 · Una conexion al broker para todo el proceso, abierta al arrancar.
const conexion = await connect(RABBITMQ_URL);
const canal = await conexion.createChannel();
await declararTopologia(canal);
console.log(`[prestamos] publicando en ${RABBITMQ_URL}`);

const publicar = (routingKey, payload) => {
  const eventoId = randomUUID();
  const aceptado = canal.publish(
    EXCHANGES.eventos.nombre,
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    {
      persistent: true,
      contentType: 'application/json',
      headers: { 'x-evento-id': eventoId, 'x-emitido-en': new Date().toISOString() },
    },
  );
  console.log(`[prestamos] publicado ${routingKey} evento ${eventoId} aceptado=${aceptado}`);
};

createServer(async (peticion, respuesta) => {
  await new Promise((listo) => setTimeout(listo, LATENCIA_SIMULADA_MS));
  const datos = leer();
  const { method: metodo, url } = peticion;
  console.log(`[prestamos] ${metodo} ${url}`);

  if (metodo === 'GET') return json(respuesta, 200, datos.prestamos);

  if (metodo === 'POST') {
    const sub = await subDelToken(peticion.headers['authorization']);
    if (!sub) return json(respuesta, 401, { mensaje: 'falta un token valido' });

    const cuerpo = await leerCuerpo(peticion);
    const nuevo = {
      ...cuerpo,
      usuarioSub: sub,                                                 // el del TOKEN, pise lo que pise
      id: Math.max(0, ...datos.prestamos.map((p) => p.id)) + 1,
    };
    datos.prestamos.push(nuevo);
    guardar(datos);                                                    // primero se escribe

    publicar(ROUTING_KEYS.prestamoCreado, {                            // y recien despues se anuncia
      prestamoId: nuevo.id,
      libroId: nuevo.libroId,
      usuarioSub: sub,
      hasta: nuevo.hasta,
    });

    return json(respuesta, 201, nuevo);
  }

  if (metodo === 'DELETE') {
    const sub = await subDelToken(peticion.headers['authorization']);
    if (!sub) return json(respuesta, 401, { mensaje: 'falta un token valido' });

    const id = Number(url.split('/').pop());
    const prestamo = datos.prestamos.find((p) => p.id === id);
    if (!prestamo) {
      return json(respuesta, 404, {
        mensaje: `no existe el prestamo ${id}`,
      });
    }

    prestamo.devuelto = true;
    guardar(datos);

    publicar(ROUTING_KEYS.prestamoDevuelto, {
      prestamoId: prestamo.id,
      libroId: prestamo.libroId,
      usuarioSub: sub,
    });

    return json(respuesta, 200, prestamo);
  }

  json(respuesta, 405, { mensaje: `metodo ${metodo} no soportado` });
}).listen(3002, () => console.log('microservicio de prestamos escuchando en http://localhost:3002'));
