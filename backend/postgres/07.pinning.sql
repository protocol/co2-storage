-- Pinning
--
--DROP TABLE IF EXISTS co2_storage_api.pins;
CREATE TABLE IF NOT EXISTS co2_storage_api.pins (
	"id" SERIAL PRIMARY KEY,
	"service" VARCHAR(255) NOT NULL,
	"cid" VARCHAR(255) NOT NULL,
	"name" VARCHAR(255) DEFAULT NULL,
	"timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	"pinned" BOOLEAN DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS pins_id_idx ON co2_storage_api.pins ("id");
CREATE INDEX IF NOT EXISTS pins_service_idx ON co2_storage_api.pins ("service");
CREATE INDEX IF NOT EXISTS pins_cid_idx ON co2_storage_api.pins ("cid");

-- Pin
--
DROP TYPE co2_storage_api.response_queue_pin CASCADE;
CREATE TYPE co2_storage_api.response_queue_pin AS ("service" VARCHAR(255), cid VARCHAR(255), "name" VARCHAR(255), ts TIMESTAMPTZ, added BOOLEAN);

--DROP FUNCTION IF EXISTS co2_storage_api.queue_pin(IN the_service VARCHAR(255), IN the_cid VARCHAR(255), IN the_name VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.queue_pin(IN the_service VARCHAR(255), IN the_cid VARCHAR(255), IN the_name VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID) RETURNS co2_storage_api.response_queue_pin AS $queue_pin$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		pin_id INTEGER DEFAULT NULL;
		added BOOLEAN DEFAULT FALSE;
		response co2_storage_api.response_queue_pin;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		-- check is this CID already pinned to the service
		SELECT "id" FROM co2_storage_api.pins WHERE "service" = the_service AND "cid" = the_cid LIMIT 1 INTO pin_id;
		IF (pin_id IS NULL) THEN
			INSERT INTO co2_storage_api.pins ("service", "cid", "name") VALUES (the_service, the_cid, the_name);
			added = TRUE;
		END IF;
		response.service = the_service;
		response.cid = the_cid;
		response.name = the_name;
		response.ts = CURRENT_TIMESTAMP;
		response.added = added;
		return response;
	END;
$queue_pin$ LANGUAGE plpgsql;
