USE master;
GO

IF DB_ID(N'WEB_QV') IS NULL
BEGIN
    CREATE DATABASE WEB_QV;
END
GO

USE WEB_QV;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Users_id DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(255) NOT NULL,
        password_hash NVARCHAR(500) NULL,
        avatar_url NVARCHAR(1000) NULL,
        provider VARCHAR(30) NULL,
        provider_account_id NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_Users_created_at DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_Users_updated_at DEFAULT SYSDATETIME(),
        CONSTRAINT PK_Users PRIMARY KEY (id),
        CONSTRAINT UQ_Users_email UNIQUE (email)
    );
END
GO

IF COL_LENGTH(N'dbo.Users', N'password_hash') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD password_hash NVARCHAR(500) NULL;
END
GO

IF COL_LENGTH(N'dbo.Users', N'email_lookup') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD email_lookup CHAR(64) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_Users_email_lookup' AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    CREATE UNIQUE INDEX UX_Users_email_lookup
    ON dbo.Users(email_lookup)
    WHERE email_lookup IS NOT NULL;
END
GO

UPDATE dbo.Users
SET email_lookup = CONVERT(CHAR(64), HASHBYTES('SHA2_256', LOWER(LTRIM(RTRIM(email)))), 2),
    updated_at = SYSDATETIME()
WHERE email_lookup IS NULL
  AND email IS NOT NULL;
GO

IF COL_LENGTH(N'dbo.Users', N'avatar_url') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD avatar_url NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH(N'dbo.Users', N'provider') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD provider VARCHAR(30) NULL;
END
GO

IF COL_LENGTH(N'dbo.Users', N'provider_account_id') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD provider_account_id NVARCHAR(255) NULL;
END
GO

IF COL_LENGTH(N'dbo.Users', N'phone_encrypted') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD phone_encrypted NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH(N'dbo.Users', N'address_encrypted') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD address_encrypted NVARCHAR(2000) NULL;
END
GO

IF COL_LENGTH(N'dbo.Users', N'oauth_refresh_token_encrypted') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD oauth_refresh_token_encrypted NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH(N'dbo.Users', N'created_at') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD created_at DATETIME2 NOT NULL CONSTRAINT DF_Users_created_at_existing DEFAULT SYSDATETIME();
END
GO

IF COL_LENGTH(N'dbo.Users', N'updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD updated_at DATETIME2 NOT NULL CONSTRAINT DF_Users_updated_at_existing DEFAULT SYSDATETIME();
END
GO

IF OBJECT_ID(N'dbo.Sessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sessions (
        id CHAR(64) NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        expires_at DATETIME2 NOT NULL,
        CONSTRAINT PK_Sessions PRIMARY KEY (id),
        CONSTRAINT FK_Sessions_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.UserLogins', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserLogins (
        id BIGINT IDENTITY(1,1) NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        login_provider VARCHAR(30) NOT NULL,
        logged_in_at DATETIME2 NOT NULL CONSTRAINT DF_UserLogins_logged_in_at DEFAULT SYSDATETIME(),
        ip_address_hash CHAR(64) NULL,
        user_agent NVARCHAR(500) NULL,
        CONSTRAINT PK_UserLogins PRIMARY KEY (id),
        CONSTRAINT FK_UserLogins_Users FOREIGN KEY (user_id)
            REFERENCES dbo.Users(id)
            ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_UserLogins_user_id_logged_in_at'
      AND object_id = OBJECT_ID(N'dbo.UserLogins')
)
BEGIN
    CREATE INDEX IX_UserLogins_user_id_logged_in_at
    ON dbo.UserLogins(user_id, logged_in_at DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_UserLogins_logged_in_at'
      AND object_id = OBJECT_ID(N'dbo.UserLogins')
)
BEGIN
    CREATE INDEX IX_UserLogins_logged_in_at
    ON dbo.UserLogins(logged_in_at DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Sessions_user_id' AND object_id = OBJECT_ID(N'dbo.Sessions')
)
BEGIN
    CREATE INDEX IX_Sessions_user_id ON dbo.Sessions(user_id);
END
GO

IF OBJECT_ID(N'dbo.UserProgress', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserProgress (
        user_id UNIQUEIDENTIFIER NOT NULL,
        completed_lesson_ids NVARCHAR(MAX) NOT NULL CONSTRAINT DF_UserProgress_completed DEFAULT N'[]',
        lesson_completions NVARCHAR(MAX) NOT NULL CONSTRAINT DF_UserProgress_completions DEFAULT N'{}',
        quiz_attempts NVARCHAR(MAX) NOT NULL CONSTRAINT DF_UserProgress_quiz DEFAULT N'[]',
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_UserProgress_updated_at DEFAULT SYSDATETIME(),
        CONSTRAINT PK_UserProgress PRIMARY KEY (user_id),
        CONSTRAINT FK_UserProgress_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE CASCADE,
        CONSTRAINT CK_UserProgress_completed_json CHECK (ISJSON(completed_lesson_ids) = 1),
        CONSTRAINT CK_UserProgress_completions_json CHECK (ISJSON(lesson_completions) = 1),
        CONSTRAINT CK_UserProgress_quiz_json CHECK (ISJSON(quiz_attempts) = 1)
    );
END
GO

UPDATE dbo.Users
SET password_hash = NULL,
    updated_at = SYSDATETIME()
WHERE provider IN ('google', 'facebook')
  AND password_hash IS NOT NULL;
GO
