-- Head
--
--DROP TABLE IF EXISTS co2_storage_api.chain;
CREATE TABLE IF NOT EXISTS co2_storage_api.chain (
	"id" SERIAL PRIMARY KEY,
	"chain_name" VARCHAR(255) DEFAULT 'sandbox',
	"head" VARCHAR(255) NOT NULL,
	"account" VARCHAR(255) NOT NULL,
	"timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	"scraped" BOOLEAN DEFAULT NULL,
	"archived" BOOLEAN DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS chain_id_idx ON co2_storage_api.chain ("id");
CREATE INDEX IF NOT EXISTS chain_chain_name_idx ON co2_storage_api.chain ("chain_name");
CREATE INDEX IF NOT EXISTS chain_head_idx ON co2_storage_api.chain ("head");
CREATE INDEX IF NOT EXISTS chain_account_idx ON co2_storage_api.chain ("account");

-- Update head
--
DROP TYPE co2_storage_api.response_update_head CASCADE;
CREATE TYPE co2_storage_api.response_update_head AS (head VARCHAR(255), account VARCHAR(255), updated BOOLEAN, ts TIMESTAMPTZ);

--DROP FUNCTION IF EXISTS co2_storage_api.update_head(IN the_chain_name VARCHAR(255), IN the_head VARCHAR(255), IN the_new_head VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.update_head(IN the_chain_name VARCHAR(255), IN the_head VARCHAR(255), IN the_new_head VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID) RETURNS co2_storage_api.response_update_head AS $update_head$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		updated BOOLEAN DEFAULT NULL;
		current_head VARCHAR(255) DEFAULT NULL;
		head_match BOOLEAN DEFAULT NULL;
		response co2_storage_api.response_update_head;
	BEGIN
		IF (the_head = '') THEN
			the_head = NULL;
		END IF;
		IF (the_chain_name IS NULL OR the_chain_name = '') THEN
			the_chain_name = 'sandbox';
		END IF;
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		-- check latest head record is correct
		SELECT "head" FROM co2_storage_api.chain WHERE "chain_name" = the_chain_name ORDER BY "timestamp" DESC LIMIT 1 INTO current_head;
		IF (current_head IS NULL) THEN
			head_match = TRUE;
		ELSE
			SELECT (current_head = the_head) INTO head_match;
		END IF;
		IF (auth IS NOT NULL AND auth = TRUE AND head_match IS NOT NULL AND head_match = TRUE) THEN
			INSERT INTO co2_storage_api.chain ("chain_name", "head", "account", "timestamp") VALUES (the_chain_name, the_new_head, the_account, CURRENT_TIMESTAMP);
			updated = TRUE;
		ELSE
			updated = FALSE;
			the_head = NULL;
			the_new_head = NULL;
			the_account = NULL;
		END IF;
		response.head = the_new_head;
		response.account = the_account;
		response.updated = updated;
		response.ts = CURRENT_TIMESTAMP;
		return response;
	END;
$update_head$ LANGUAGE plpgsql;
