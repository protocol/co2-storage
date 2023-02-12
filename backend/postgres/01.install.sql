-- login as postgres
CREATE ROLE co2_storage WITH LOGIN PASSWORD 'secret';
CREATE DATABASE co2_storage;
\c co2_storage
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS co2_storage_api AUTHORIZATION co2_storage;
CREATE SCHEMA IF NOT EXISTS co2_storage_scraper AUTHORIZATION co2_storage;
CREATE SCHEMA IF NOT EXISTS co2_storage_helpers AUTHORIZATION co2_storage;
