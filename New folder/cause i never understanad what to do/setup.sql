CREATE USER reconcile WITH PASSWORD 'reconcile' CREATEDB;
CREATE DATABASE reconcile OWNER reconcile;
GRANT ALL PRIVILEGES ON DATABASE reconcile TO reconcile;
