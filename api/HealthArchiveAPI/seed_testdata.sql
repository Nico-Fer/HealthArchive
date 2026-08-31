-- Datos de prueba para HealthArchive (Postgres)
-- Ejecutar contra la DB "HealthArchive". Es idempotente: limpia y recarga.
-- Genera 1 doctor (login), 50 pacientes (cada uno con su HCE y sus coberturas) y
-- evoluciones para los primeros pacientes, suficiente para probar paginacion/busqueda.

BEGIN;

-- Limpieza (orden por FKs; cascada cubre HCEs->Evolutions/HCEFiles y
-- Patients->PatientMedicalCoverages igual, pero se listan para que se lea completo)
TRUNCATE TABLE "Evolutions", "HCEFiles", "HCEs", "PatientMedicalCoverages",
               "Patients", "Doctors" RESTART IDENTITY CASCADE;

-- Doctor de prueba. El Id es fijo (y no gen_random_uuid()) porque las evoluciones de
-- mas abajo lo necesitan como autor: solo el autor puede editar su evolucion, asi que
-- sin esto el seed generaria evoluciones que nadie puede tocar.
INSERT INTO "Doctors" ("Id","Name","LastName","Email","Password",
    "PhoneNumber_CountryCode","PhoneNumber_PhoneNumber","Tuition","Description")
VALUES ('d0c70000-0000-0000-0000-000000000001','Gregory','House','doctor@test.com','1234',
    '+54','91122334455','MN123456','Medico de prueba');

-- 50 pacientes con datos variados
WITH params AS (
  SELECT
    ARRAY['Juan','Maria','Carlos','Lucia','Pedro','Ana','Diego','Sofia','Martin','Valentina',
          'Lucas','Camila','Mateo','Julieta','Tomas','Florencia','Nicolas','Agustina','Franco','Paula'] AS nombres,
    ARRAY['Gomez','Perez','Rodriguez','Fernandez','Lopez','Diaz','Martinez','Sanchez','Romero','Torres',
          'Ruiz','Flores','Acosta','Benitez','Medina','Suarez','Herrera','Aguirre','Gimenez','Rojas'] AS apellidos,
    ARRAY['Argentina','Uruguay','Chile','Paraguay','Bolivia'] AS paises,
    ARRAY['Docente','Contador','Ingeniero','Comerciante','Jubilado','Estudiante','Empleado','Medico'] AS ocupaciones
)
INSERT INTO "Patients" ("Id","Name","LastName","DNI","BirthDate","Country","Email",
    "PhoneNumber_CountryCode","PhoneNumber_PhoneNumber","Ocupation","HomeAddress","Note")
SELECT
  gen_random_uuid(),
  p.nombres[1 + (g % array_length(p.nombres,1))],
  p.apellidos[1 + ((g * 3) % array_length(p.apellidos,1))],
  (30000000 + g)::text,
  (DATE '1950-01-01' + (g * 137) * INTERVAL '1 day')::timestamp,
  p.paises[1 + (g % array_length(p.paises,1))],
  'paciente' || g || '@test.com',
  '+54',
  '911' || lpad((50000000 + g)::text, 8, '0'),
  p.ocupaciones[1 + (g % array_length(p.ocupaciones,1))],
  'Calle Falsa ' || (100 + g),
  'Paciente de prueba #' || g
FROM generate_series(1, 50) AS g, params p;

-- Una HCE por paciente
INSERT INTO "HCEs" ("Id","PatientId")
SELECT gen_random_uuid(), "Id" FROM "Patients";

-- Coberturas. "Order" = 0 es la principal: es la que se muestra en el listado.
-- A los primeros 10 pacientes se les carga una segunda para poder probar la vista
-- de multiples coberturas sin tener que cargarla a mano.
WITH coberturas AS (SELECT ARRAY['OSDE','Swiss Medical','Galeno','Medife','PAMI','IOMA','Sancor Salud','Particular'] AS nombres)
INSERT INTO "PatientMedicalCoverages" ("PatientId","Coverage","Number","Order")
SELECT
  pt."Id",
  c.nombres[1 + (g % array_length(c.nombres,1))],
  lpad((1000 + g)::text, 6, '0'),
  0
FROM "Patients" pt, coberturas c, LATERAL (SELECT pt."DNI"::int - 30000000 AS g) s;

WITH coberturas AS (SELECT ARRAY['OSDE','Swiss Medical','Galeno','Medife','PAMI','IOMA','Sancor Salud','Particular'] AS nombres)
INSERT INTO "PatientMedicalCoverages" ("PatientId","Coverage","Number","Order")
SELECT
  pt."Id",
  c.nombres[1 + ((g + 3) % array_length(c.nombres,1))],
  lpad((9000 + g)::text, 6, '0'),
  1
FROM "Patients" pt, coberturas c, LATERAL (SELECT pt."DNI"::int - 30000000 AS g) s
WHERE pt."DNI"::int BETWEEN 30000001 AND 30000010;

-- 1 a 3 evoluciones para los primeros 8 pacientes (por DNI 30000001..30000008).
-- CreatedDate = ModifiedDate a proposito: son evoluciones "nunca editadas", que es
-- como las muestra la UI.
INSERT INTO "Evolutions" ("Id","HCEId","Notes",
    "EvolutionInfo_ModifiedBy","EvolutionInfo_Tuition",
    "CreatedByDoctorId","CreatedDate","ModifiedDate")
SELECT
  gen_random_uuid(),
  h."Id",
  -- El texto va como rawContentState de draft-js, que es el formato en el que la app
  -- guarda las notas. Con texto plano el front no puede parsearlo y no las muestra.
  json_build_object(
    'blocks', json_build_array(json_build_object(
      'key', 'seed' || e,
      'text', 'Evolucion ' || e || ': control de rutina, paciente estable.',
      'type', 'unstyled', 'depth', 0,
      'inlineStyleRanges', json_build_array(),
      'entityRanges', json_build_array(),
      'data', json_build_object()
    )),
    'entityMap', json_build_object()
  )::text,
  'Gregory House',
  'MN123456',
  'd0c70000-0000-0000-0000-000000000001',
  (NOW() - (e * 7) * INTERVAL '1 day')::timestamp,
  (NOW() - (e * 7) * INTERVAL '1 day')::timestamp
FROM "HCEs" h
JOIN "Patients" pt ON pt."Id" = h."PatientId"
CROSS JOIN generate_series(1, 3) AS e
WHERE pt."DNI"::int BETWEEN 30000001 AND 30000008;

COMMIT;

-- Resumen
SELECT 'Doctors'   AS tabla, count(*) FROM "Doctors"
UNION ALL SELECT 'Patients',   count(*) FROM "Patients"
UNION ALL SELECT 'Coberturas', count(*) FROM "PatientMedicalCoverages"
UNION ALL SELECT 'HCEs',       count(*) FROM "HCEs"
UNION ALL SELECT 'Evolutions', count(*) FROM "Evolutions";
