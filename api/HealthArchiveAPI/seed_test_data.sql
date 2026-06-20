/* =====================================================================
   HealthArchive - Datos de prueba (SQL Server)
   ---------------------------------------------------------------------
   Inserta doctores, pacientes y sus HCE con evoluciones y archivos.
   - Datos ficticios (no reales). Dominio en espanol.
   - Respeta los owned types aplanados de EF Core:
       Doctor.PhoneNumber        -> PhoneNumber_CountryCode / PhoneNumber_PhoneNumber
       Patient.PhoneNumber       -> idem
       Patient.MedicalCoverage   -> MedicalCoverage_Coverage / MedicalCoverage_Number
       Evolution.EvolutionInfo   -> EvolutionInfo_ModifiedBy / EvolutionInfo_Tuition
   - Las contrasenas van en texto plano (todavia no hay auth real).

   Uso:
     sqlcmd -S localhost -E -C -d HealthArchive -i seed_test_data.sql
   o pegarlo en SSMS / Azure Data Studio sobre la base HealthArchive.

   OJO: re-ejecutar este script DUPLICA las filas (genera Guids nuevos).
   ===================================================================== */

USE HealthArchive;
GO

SET NOCOUNT ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    /* ---------------------------------------------------------------
       DOCTORES
       --------------------------------------------------------------- */
    INSERT INTO Doctors
        (Id, Name, LastName, Email, Password, Tuition, Description,
         PhoneNumber_CountryCode, PhoneNumber_PhoneNumber)
    VALUES
        (NEWID(), N'Laura',   N'Gimenez',  N'laura.gimenez@clinica.test',  N'1234', N'MN-10532', N'Clinica medica',  N'+54', N'1145678901'),
        (NEWID(), N'Martin',  N'Rios',     N'martin.rios@clinica.test',    N'1234', N'MN-20987', N'Traumatologia',   N'+54', N'1156781234'),
        (NEWID(), N'Sofia',   N'Paredes',  N'sofia.paredes@clinica.test',  N'1234', N'MN-30761', N'Pediatria',       NULL,   NULL);

    /* ---------------------------------------------------------------
       PACIENTES (con su HCE asociada)
       --------------------------------------------------------------- */

    -- Paciente 1 ----------------------------------------------------
    DECLARE @pat1 UNIQUEIDENTIFIER = NEWID();
    DECLARE @hce1 UNIQUEIDENTIFIER = NEWID();

    INSERT INTO Patients
        (Id, Name, LastName, DNI, BirthDate, Country,
         PhoneNumber_CountryCode, PhoneNumber_PhoneNumber, HomeAddress,
         MedicalCoverage_Coverage, MedicalCoverage_Number,
         Email, Note, Ocupation)
    VALUES
        (@pat1, N'Juan', N'Perez', N'30111222', '1989-04-12', N'Argentina',
         N'+54', N'1144556677', N'Av. Rivadavia 1234, CABA',
         N'OSDE', N'62-3344556',
         N'juan.perez@mail.test', N'Hipertension controlada.', N'Contador');

    INSERT INTO HCEs (Id, PatientId) VALUES (@hce1, @pat1);

    INSERT INTO Evolutions
        (Id, HCEId, Notes, ModifiedDate, EvolutionInfo_ModifiedBy, EvolutionInfo_Tuition)
    VALUES
        (NEWID(), @hce1, N'Consulta inicial. Se solicita analisis de sangre y control de presion.',
         '2025-03-10T09:30:00', N'Laura Gimenez', N'MN-10532'),
        (NEWID(), @hce1, N'Resultados normales. Se mantiene medicacion antihipertensiva.',
         '2025-04-02T11:15:00', N'Laura Gimenez', N'MN-10532');

    INSERT INTO HCEFiles (Id, FileName, Content, HCEId)
    VALUES
        (NEWID(), N'analisis_sangre_2025-03.pdf',
         CONVERT(VARBINARY(MAX), N'%PDF-1.4 contenido de prueba analisis'), @hce1);

    -- Paciente 2 ----------------------------------------------------
    DECLARE @pat2 UNIQUEIDENTIFIER = NEWID();
    DECLARE @hce2 UNIQUEIDENTIFIER = NEWID();

    INSERT INTO Patients
        (Id, Name, LastName, DNI, BirthDate, Country,
         PhoneNumber_CountryCode, PhoneNumber_PhoneNumber, HomeAddress,
         MedicalCoverage_Coverage, MedicalCoverage_Number,
         Email, Note, Ocupation)
    VALUES
        (@pat2, N'Maria', N'Lopez', N'28999888', '1995-09-23', N'Argentina',
         N'+54', N'1133221100', N'Calle Falsa 742, La Plata',
         N'Swiss Medical', N'SM-998877',
         N'maria.lopez@mail.test', N'Sin antecedentes relevantes.', N'Docente');

    INSERT INTO HCEs (Id, PatientId) VALUES (@hce2, @pat2);

    INSERT INTO Evolutions
        (Id, HCEId, Notes, ModifiedDate, EvolutionInfo_ModifiedBy, EvolutionInfo_Tuition)
    VALUES
        (NEWID(), @hce2, N'Control anual. Paciente asintomatica. Se indican vacunas al dia.',
         '2025-05-18T16:00:00', N'Sofia Paredes', N'MN-30761');

    -- Paciente 3 ----------------------------------------------------
    DECLARE @pat3 UNIQUEIDENTIFIER = NEWID();
    DECLARE @hce3 UNIQUEIDENTIFIER = NEWID();

    INSERT INTO Patients
        (Id, Name, LastName, DNI, BirthDate, Country,
         PhoneNumber_CountryCode, PhoneNumber_PhoneNumber, HomeAddress,
         MedicalCoverage_Coverage, MedicalCoverage_Number,
         Email, Note, Ocupation)
    VALUES
        (@pat3, N'Carlos', N'Fernandez', N'33444555', '2001-12-01', N'Argentina',
         N'+54', N'1166778899', N'Belgrano 555, Rosario',
         NULL, NULL,
         N'carlos.fernandez@mail.test', N'Esguince de tobillo en tratamiento.', N'Estudiante');

    INSERT INTO HCEs (Id, PatientId) VALUES (@hce3, @pat3);

    INSERT INTO Evolutions
        (Id, HCEId, Notes, ModifiedDate, EvolutionInfo_ModifiedBy, EvolutionInfo_Tuition)
    VALUES
        (NEWID(), @hce3, N'Ingreso por esguince grado II. Inmovilizacion y reposo.',
         '2025-06-01T08:45:00', N'Martin Rios', N'MN-20987'),
        (NEWID(), @hce3, N'Evolucion favorable. Inicio de kinesiologia.',
         '2025-06-12T10:20:00', N'Martin Rios', N'MN-20987');

    INSERT INTO HCEFiles (Id, FileName, Content, HCEId)
    VALUES
        (NEWID(), N'radiografia_tobillo.png',
         CONVERT(VARBINARY(MAX), N'PNG contenido de prueba radiografia'), @hce3);

    -- Paciente 4 (sin evoluciones todavia) -------------------------
    DECLARE @pat4 UNIQUEIDENTIFIER = NEWID();
    DECLARE @hce4 UNIQUEIDENTIFIER = NEWID();

    INSERT INTO Patients
        (Id, Name, LastName, DNI, BirthDate, Country,
         PhoneNumber_CountryCode, PhoneNumber_PhoneNumber, HomeAddress,
         MedicalCoverage_Coverage, MedicalCoverage_Number,
         Email, Note, Ocupation)
    VALUES
        (@pat4, N'Lucia', N'Martinez', N'40555666', '2010-07-30', N'Argentina',
         N'+54', N'1199887766', N'San Martin 90, Cordoba',
         N'PAMI', N'PAMI-554433',
         N'lucia.martinez@mail.test', N'Paciente pediatrica. Controles de rutina.', N'-');

    INSERT INTO HCEs (Id, PatientId) VALUES (@hce4, @pat4);

    COMMIT TRANSACTION;
    PRINT 'Datos de prueba insertados correctamente.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT 'Error al insertar datos de prueba:';
    PRINT ERROR_MESSAGE();
    THROW;
END CATCH;
GO

/* Verificacion rapida de conteos */
SELECT 'Doctors'    AS Tabla, COUNT(*) AS Filas FROM Doctors
UNION ALL SELECT 'Patients',  COUNT(*) FROM Patients
UNION ALL SELECT 'HCEs',      COUNT(*) FROM HCEs
UNION ALL SELECT 'Evolutions',COUNT(*) FROM Evolutions
UNION ALL SELECT 'HCEFiles',  COUNT(*) FROM HCEFiles;
GO
