-- Head
--
--DROP TABLE IF EXISTS co2_storage_api.chain;
CREATE TABLE IF NOT EXISTS co2_storage_api.chain (
	"id" SERIAL PRIMARY KEY,
	"head" VARCHAR(255) NOT NULL,
	"account" VARCHAR(255) NOT NULL,
	"timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	"scraped" BOOLEAN DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS chain_id_idx ON co2_storage_api.chain ("id");
CREATE INDEX IF NOT EXISTS chain_head_idx ON co2_storage_api.chain ("head");
CREATE INDEX IF NOT EXISTS chain_account_idx ON co2_storage_api.chain ("account");

-- Update head
--
DROP TYPE response_update_head CASCADE;
CREATE TYPE response_update_head AS (head VARCHAR(255), account VARCHAR(255), updated BOOLEAN, ts TIMESTAMPTZ);

--DROP FUNCTION IF EXISTS co2_storage_api.update_head(IN the_head VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.update_head(IN the_head VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID) RETURNS response_update_head AS $update_head$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		updated BOOLEAN DEFAULT NULL;
		response response_update_head;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			INSERT INTO co2_storage_api.chain ("head", "account", "timestamp") VALUES (the_head, the_account, CURRENT_TIMESTAMP);
			updated = TRUE;
		ELSE
			updated = FALSE;
		END IF;
		response.head = the_head;
		response.account = the_account;
		response.updated = updated;
		response.ts = CURRENT_TIMESTAMP;
		return response;
	END;
$update_head$ LANGUAGE plpgsql;
