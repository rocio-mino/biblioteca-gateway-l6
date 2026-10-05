// Lo que publica prestamos.mjs: un exchange y dos routing keys. Ninguna cola.
export const EXCHANGES = {
  eventos: { nombre: 'biblioteca.eventos', tipo: 'topic' },
};

export const ROUTING_KEYS = {
  prestamoCreado: 'prestamo.creado',
  prestamoDevuelto: 'prestamo.devuelto',
};

export async function declararTopologia(canal) {
  await canal.assertExchange(EXCHANGES.eventos.nombre, EXCHANGES.eventos.tipo, { durable: true });
}