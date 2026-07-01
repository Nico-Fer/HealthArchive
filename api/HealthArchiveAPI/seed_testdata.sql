-- Datos de prueba para HealthArchive (Postgres)
-- Ejecutar contra la DB "HealthArchive". Es idempotente: limpia y recarga.
-- Genera 1 doctor (login), 50 pacientes (cada uno con su HCE) y evoluciones
-- para los primeros pacientes, suficiente para probar paginacion/busqueda.

BEGIN;

-- Limpieza (orden por FKs; cascada cubre HCEs->Evolutions/HCEFiles igual)
TRUNCATE TABLE "Evolutions", "HCEFiles", "HCEs", "Patients", "Doctors" RESTART IDENTITY CASCADE;

-- Doctor de prueba (password en texto plano, asi lo compara AuthServiceRepository)
INSERT INTO "Doctors" ("Id","Name","LastName","Email","Password",
    "PhoneNumber_CountryCode","PhoneNumber_PhoneNumber","Tuition","Description")
VALUES (gen_random_uuid(),'Gregory','House','doctor@test.com','1234',
    '+54','91122334455','MN123456','Medico de prueba');

-- 50 pacientes con datos variados + HCE por paciente
WITH params AS (
  SELECT
    ARRAY['Juan','Maria','Carlos','Lucia','Pedro','Ana','Diego','Sofia','Martin','Valentina',
          'Lucas','Camila','Mateo','Julieta','Tomas','Florencia','Nicolas','Agustina','Franco','Paula'] AS nombres,
    ARRAY['Gomez','Perez','Rodriguez','Fernandez','Lopez','Diaz','Martinez','Sanchez','Romero','Torres',
          'Ruiz','Flores','Acosta','Benitez','Medina','Suarez','Herrera','Aguirre','Gimenez','Rojas'] AS apellidos,
    ARRAY['OSDE','Swiss Medical','Galeno','Medife','PAMI','IOMA','Sancor Salud','Particular'] AS coberturas,
    ARRAY['Argentina','Uruguay','Chile','Paraguay','Bolivia'] AS paises,
    ARRAY['Docente','Contador','Ingeniero','Comerciante','Jubilado','Estudiante','Empleado','Medico'] AS ocupaciones
),
new_patients AS (
  INSERT INTO "Patients" ("Id","Name","LastName","DNI","BirthDate","Country","Email",
      "PhoneNumber_CountryCode","PhoneNumber_PhoneNumber","Ocupation","HomeAddress","Note",
      "MedicalCoverage_Number","MedicalCoverage_Coverage")
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
    'Paciente de prueba #' || g,
    lpad((1000 + g)::text, 6, '0'),
    p.coberturas[1 + (g % array_length(p.coberturas,1))]
  FROM generate_series(1, 50) AS g, params p
  RETURNING "Id"
)
INSERT INTO "HCEs" ("Id","PatientId")
SELECT gen_random_uuid(), "Id" FROM new_patients;

-- 1 a 3 evoluciones para los primeros 8 pacientes (por DNI 30000001..30000008)
INSERT INTO "Evolutions" ("Id","HCEId","Notes",
    "EvolutionInfo_ModifiedBy","EvolutionInfo_Tuition","ModifiedDate")
SELECT
  gen_random_uuid(),
  h."Id",
  'Evolucion ' || e || ': control de rutina, paciente estable.',
  'Gregory House',
  'MN123456',
  (NOW() - (e * 7) * INTERVAL '1 day')::timestamp
FROM "HCEs" h
JOIN "Patients" pt ON pt."Id" = h."PatientId"
CROSS JOIN generate_series(1, 3) AS e
WHERE pt."DNI"::int BETWEEN 30000001 AND 30000008;

COMMIT;

-- Resumen
SELECT 'Doctors'   AS tabla, count(*) FROM "Doctors"
UNION ALL SELECT 'Patients',  count(*) FROM "Patients"
UNION ALL SELECT 'HCEs',      count(*) FROM "HCEs"
UNION ALL SELECT 'Evolutions',count(*) FROM "Evolutions";
