-- Dueno: prestamos.mjs. Ningun otro servicio escribe en este esquema.
CREATE SCHEMA IF NOT EXISTS prestamos;

CREATE TABLE IF NOT EXISTS prestamos.prestamos (
  id           integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  libro_id     integer     NOT NULL,                 -- id de libros.mjs: un dato, SIN clave foranea
  usuario_sub  text        NOT NULL,                 -- del token, nunca del cuerpo
  estado       text        NOT NULL DEFAULT 'vigente',
  desde        date        NOT NULL,
  hasta        date        NOT NULL,
  creado_en    timestamptz NOT NULL DEFAULT now(),
  devuelto_en  timestamptz,
  CONSTRAINT ck_prestamos_estado CHECK (estado IN ('vigente', 'devuelto'))
);

-- La regla de negocio: un lector no tiene dos prestamos VIGENTES del mismo libro.
CREATE UNIQUE INDEX IF NOT EXISTS uq_prestamos_vigente
  ON prestamos.prestamos (usuario_sub, libro_id) WHERE estado = 'vigente';

-- La consulta real: los prestamos de un lector.
CREATE INDEX IF NOT EXISTS ix_prestamos_usuario_sub ON prestamos.prestamos (usuario_sub);