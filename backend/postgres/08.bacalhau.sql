-- Bacalhau
--
--DROP TABLE IF EXISTS co2_storage_api.bacalhau_jobs;
CREATE TABLE IF NOT EXISTS co2_storage_api.bacalhau_jobs (
	"id" SERIAL PRIMARY KEY,
	"account" VARCHAR(255) NOT NULL,
	"job" VARCHAR(255) NOT NULL,
	"uuid" UUID DEFAULT NULL,
	"cid" VARCHAR(255) DEFAULT NULL,
	"started" TIMESTAMPTZ DEFAULT NULL,
	"ended" TIMESTAMPTZ DEFAULT NULL,
	"message" TEXT DEFAULT NULL,
	"timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS bacalhau_jobs_id_idx ON co2_storage_api.bacalhau_jobs ("id");
CREATE INDEX IF NOT EXISTS bacalhau_jobs_account_idx ON co2_storage_api.bacalhau_jobs ("account");
CREATE INDEX IF NOT EXISTS bacalhau_jobs_key_idx ON co2_storage_api.bacalhau_jobs ("job");

-- Job status
--
DROP TYPE co2_storage_api.response_job_status CASCADE;
CREATE TYPE co2_storage_api.response_job_status AS (job UUID, cid VARCHAR(255), "message" TEXT);

--DROP FUNCTION IF EXISTS co2_storage_api.job_status(IN the_account VARCHAR(255), IN the_token UUID, IN the_job_uuid UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.job_status(IN the_account VARCHAR(255), IN the_token UUID, IN the_job_uuid UUID) RETURNS co2_storage_api.response_job_status AS $job_status$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		cd VARCHAR(255) DEFAULT NULL;
		msg TEXT DEFAULT NULL;
		tmstmp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
		response co2_storage_api.response_job_status;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			-- look for cid
			SELECT "cid", "message" INTO cd, msg
			FROM co2_storage_api.bacalhau_jobs WHERE "uuid" = the_job_uuid;
		ELSE
			cd = NULL;
			msg = NULL;
		END IF;
		response.job = the_job_uuid;
		response.cid = cd;
		response.message = msg;
		return response;
	END;
$job_status$ LANGUAGE plpgsql;

-- Add job
--
DROP TYPE co2_storage_api.response_add_job CASCADE;
CREATE TYPE co2_storage_api.response_add_job AS (account VARCHAR(255), "job" VARCHAR(255), id INTEGER);

--DROP FUNCTION IF EXISTS co2_storage_api.add_job(IN the_account VARCHAR(255), IN the_token UUID, IN the_job VARCHAR(255));
CREATE OR REPLACE FUNCTION co2_storage_api.add_job(IN the_account VARCHAR(255), IN the_token UUID, IN the_job VARCHAR(255)) RETURNS co2_storage_api.response_add_job AS $add_job$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		iid INTEGER DEFAULT NULL;
		response co2_storage_api.response_add_job;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			-- insert new job
			INSERT INTO co2_storage_api.bacalhau_jobs ("account", "job") VALUES (the_account, the_job) RETURNING id INTO iid;
		END IF;
		response.account = the_account;
		response.job = the_job;
		response.id = iid;
		return response;
	END;
$add_job$ LANGUAGE plpgsql;

-- Job started
--
DROP TYPE co2_storage_api.response_job_started CASCADE;
CREATE TYPE co2_storage_api.response_job_started AS (id INTEGER, "started" BOOLEAN);

--DROP FUNCTION IF EXISTS co2_storage_api.job_started(IN the_account VARCHAR(255), IN the_token UUID, IN the_id INTEGER);
CREATE OR REPLACE FUNCTION co2_storage_api.job_started(IN the_account VARCHAR(255), IN the_token UUID, IN the_id INTEGER) RETURNS co2_storage_api.response_job_started AS $job_started$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		strtd BOOLEAN DEFAULT NULL;
		response co2_storage_api.response_job_started;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			UPDATE co2_storage_api.bacalhau_jobs SET "started" = CURRENT_TIMESTAMP WHERE "id" = the_id AND "account" = the_account;
			strtd = TRUE;
		ELSE
			strtd = FALSE;
		END IF;
		response.id = the_id;
		response.started = strtd;
		return response;
	END;
$job_started$ LANGUAGE plpgsql;

-- Job ended
--
DROP TYPE co2_storage_api.response_job_ended CASCADE;
CREATE TYPE co2_storage_api.response_job_ended AS (id INTEGER, "ended" BOOLEAN);

--DROP FUNCTION IF EXISTS co2_storage_api.job_ended(IN the_account VARCHAR(255), IN the_token UUID, IN the_id INTEGER);
CREATE OR REPLACE FUNCTION co2_storage_api.job_ended(IN the_account VARCHAR(255), IN the_token UUID, IN the_id INTEGER) RETURNS co2_storage_api.response_job_ended AS $job_ended$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		ndd BOOLEAN DEFAULT NULL;
		response co2_storage_api.response_job_ended;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			UPDATE co2_storage_api.bacalhau_jobs SET "ended" = CURRENT_TIMESTAMP WHERE "id" = the_id AND "account" = the_account;
			ndd = TRUE;
		ELSE
			ndd = FALSE;
		END IF;
		response.id = the_id;
		response.ended = ndd;
		return response;
	END;
$job_ended$ LANGUAGE plpgsql;

-- Job uuid
--
DROP TYPE co2_storage_api.response_job_uuid CASCADE;
CREATE TYPE co2_storage_api.response_job_uuid AS (id INTEGER, success BOOLEAN);

--DROP FUNCTION IF EXISTS co2_storage_api.job_uuid(IN the_account VARCHAR(255), IN the_token UUID, IN the_id INTEGER, IN the_job_uuid UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.job_uuid(IN the_account VARCHAR(255), IN the_token UUID, IN the_id INTEGER, IN the_job_uuid UUID) RETURNS co2_storage_api.response_job_uuid AS $job_uuid$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		success BOOLEAN DEFAULT NULL;
		response co2_storage_api.response_job_uuid;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			UPDATE co2_storage_api.bacalhau_jobs SET "uuid" = the_job_uuid WHERE "id" = the_id AND "account" = the_account;
			success = TRUE;
		ELSE
			success = FALSE;
		END IF;
		response.id = the_id;
		response.success = success;
		return response;
	END;
$job_uuid$ LANGUAGE plpgsql;

-- Job cid
--
DROP TYPE co2_storage_api.response_job_cid CASCADE;
CREATE TYPE co2_storage_api.response_job_cid AS (id INTEGER, success BOOLEAN);

--DROP FUNCTION IF EXISTS co2_storage_api.job_cid(IN the_account VARCHAR(255), IN the_token UUID, IN the_id INTEGER, IN the_job_cid VARCHAR(255), IN the_message TEXT);
CREATE OR REPLACE FUNCTION co2_storage_api.job_cid(IN the_account VARCHAR(255), IN the_token UUID, IN the_id INTEGER, IN the_job_cid VARCHAR(255), IN the_message TEXT) RETURNS co2_storage_api.response_job_cid AS $job_cid$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		success BOOLEAN DEFAULT NULL;
		response co2_storage_api.response_job_cid;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			UPDATE co2_storage_api.bacalhau_jobs SET "cid" = the_job_cid, "message" = the_message WHERE id = the_id AND "account" = the_account;
			success = TRUE;
		ELSE
			success = FALSE;
		END IF;
		response.id = the_id;
		response.success = success;
		return response;
	END;
$job_cid$ LANGUAGE plpgsql;
