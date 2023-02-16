-- Estuary
--
--DROP TABLE IF EXISTS co2_storage_api.estuary_keys;
CREATE TABLE IF NOT EXISTS co2_storage_api.estuary_keys (
	"id" SERIAL PRIMARY KEY,
	"account" VARCHAR(255) NOT NULL,
	"key" VARCHAR(255) NOT NULL,
	"validity" TIMESTAMPTZ NOT NULL,
	"timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS estuary_keys_id_idx ON co2_storage_api.estuary_keys ("id");
CREATE INDEX IF NOT EXISTS estuary_keys_account_idx ON co2_storage_api.estuary_keys ("account");
CREATE INDEX IF NOT EXISTS estuary_keys_key_idx ON co2_storage_api.estuary_keys ("key");

-- Read existing key
--
DROP TYPE co2_storage_api.response_estuary_key CASCADE;
CREATE TYPE co2_storage_api.response_estuary_key AS (account VARCHAR(255), "key" VARCHAR(255), validity TIMESTAMPTZ, ts TIMESTAMPTZ);

--DROP FUNCTION IF EXISTS co2_storage_api.estuary_key(IN the_account VARCHAR(255), IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.estuary_key(IN the_account VARCHAR(255), IN the_token UUID) RETURNS co2_storage_api.response_estuary_key AS $estuary_key$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		ky VARCHAR(255) DEFAULT NULL;
		vldt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
		tmstmp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
		response co2_storage_api.response_estuary_key;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			-- find a key
			SELECT "account", "key", "validity", "timestamp"
			INTO accnt, ky, vldt, tmstmp
			FROM co2_storage_api.estuary_keys WHERE "account" = the_account;
		ELSE
			accnt = NULL;
			ky = NULL;
		END IF;
		response.account = accnt;
		response.key = ky;
		response.validity = vldt;
		response.ts = CURRENT_TIMESTAMP;
		return response;
	END;
$estuary_key$ LANGUAGE plpgsql;

-- Add key
--
DROP TYPE co2_storage_api.response_add_estuary_key CASCADE;
CREATE TYPE co2_storage_api.response_add_estuary_key AS (account VARCHAR(255), "key" VARCHAR(255), validity TIMESTAMPTZ, ts TIMESTAMPTZ, added BOOLEAN);

--DROP FUNCTION IF EXISTS co2_storage_api.add_estuary_key(IN the_account VARCHAR(255), IN the_key VARCHAR(255), IN the_validity TIMESTAMPTZ, IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.add_estuary_key(IN the_account VARCHAR(255), IN the_key VARCHAR(255), IN the_validity TIMESTAMPTZ, IN the_token UUID) RETURNS co2_storage_api.response_add_estuary_key AS $add_estuary_key$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		added BOOLEAN DEFAULT NULL;
		response co2_storage_api.response_add_estuary_key;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			-- delete previously existing keys for a given account
			DELETE FROM co2_storage_api.estuary_keys WHERE "account" = the_account;
			-- insert new key
			INSERT INTO co2_storage_api.estuary_keys ("account", "key", "validity") VALUES (the_account, the_key, the_validity);
			added = TRUE;
		ELSE
			added = FALSE;
			the_account = NULL;
			the_key = NULL;
			the_validity = NULL;
		END IF;
		response.account = the_account;
		response.key = the_key;
		response.validity = the_validity;
		response.ts = CURRENT_TIMESTAMP;
		response.added = added;
		return response;
	END;
$add_estuary_key$ LANGUAGE plpgsql;

-- Remove key
--
DROP TYPE co2_storage_api.response_remove_estuary_key CASCADE;
CREATE TYPE co2_storage_api.response_remove_estuary_key AS (account VARCHAR(255), ts TIMESTAMPTZ, removed BOOLEAN);

--DROP FUNCTION IF EXISTS co2_storage_api.remove_estuary_key(IN the_account VARCHAR(255), IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.remove_estuary_key(IN the_account VARCHAR(255), IN the_token UUID) RETURNS co2_storage_api.response_remove_estuary_key AS $remove_estuary_key$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		removed BOOLEAN DEFAULT NULL;
		response co2_storage_api.response_remove_estuary_key;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			-- delete existing keys for a given account
			DELETE FROM co2_storage_api.estuary_keys WHERE "account" = the_account;
			removed = TRUE;
		ELSE
			removed = FALSE;
			the_account = NULL;
		END IF;
		response.account = the_account;
		response.ts = CURRENT_TIMESTAMP;
		response.removed = removed;
		return response;
	END;
$remove_estuary_key$ LANGUAGE plpgsql;
