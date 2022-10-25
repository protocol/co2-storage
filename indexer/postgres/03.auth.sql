-- Auth
--
--DROP TABLE IF EXISTS co2_storage_api.account;
CREATE TABLE IF NOT EXISTS co2_storage_api.account (
	"id" SERIAL PRIMARY KEY,
	"account" VARCHAR(255) NOT NULL,
	"token" UUID DEFAULT NULL,
	"token_validity" TIMESTAMPTZ DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS account_id_idx ON co2_storage_api.account ("id");
CREATE INDEX IF NOT EXISTS account_account_idx ON co2_storage_api.account ("account");
CREATE INDEX IF NOT EXISTS account_token_idx ON co2_storage_api.account ("token");

-- Master account
--
--DROP TABLE IF EXISTS co2_storage_api.master_account;
CREATE TABLE IF NOT EXISTS co2_storage_api.master_account (
	"id" SERIAL PRIMARY KEY,
	"password" VARCHAR NOT NULL,
	"valid" BOOLEAN DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS master_account_id_idx ON co2_storage_api.master_account ("id");

-- INSERT INTO co2_storage_api.master_account ("password") VALUES (crypt('secret', gen_salt('md5')));

-- Account authentication
--
DROP TYPE response_authenticate CASCADE;
CREATE TYPE response_authenticate AS (account VARCHAR(255), authenticated BOOLEAN,
	token UUID, token_validity TIMESTAMPTZ);

--DROP FUNCTION IF EXISTS co2_storage_api.authenticate(IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.authenticate(IN the_token UUID) RETURNS response_authenticate AS $authenticate$
	DECLARE
		accnt VARCHAR(255) DEFAULT NULL;
		authenticated BOOLEAN DEFAULT NULL;
		tkn UUID DEFAULT NULL;
		tkn_validity TIMESTAMPTZ DEFAULT NULL;
		response response_authenticate;
	BEGIN
		SELECT "account", "token", ("token" = the_token AND "token_validity" >= now())
		INTO accnt, tkn, authenticated
		FROM co2_storage_api.account
		WHERE "token" = the_token;
		IF (authenticated IS NOT NULL AND authenticated = TRUE) THEN
			tkn_validity = (now() + INTERVAL '1 YEAR');
		ELSE
			authenticated = FALSE;
			tkn = NULL;
			tkn_validity = NULL;
		END IF;
		IF (tkn IS NOT NULL) THEN
			UPDATE co2_storage_api.account SET "token_validity" = tkn_validity WHERE "token" = tkn;
		END IF;
		response.account = accnt;
		response.authenticated = authenticated;
		response.token = tkn;
		response.token_validity = tkn_validity;
		return response;
	END;
$authenticate$ LANGUAGE plpgsql;

-- Account signup
--
DROP TYPE response_signup CASCADE;
CREATE TYPE response_signup AS (account VARCHAR(255), signedup BOOLEAN,
	token UUID, token_validity TIMESTAMPTZ);

--DROP FUNCTION IF EXISTS co2_storage_api.signup(IN the_password VARCHAR, IN the_account VARCHAR(255), IN issue_new_token BOOLEAN);
CREATE OR REPLACE FUNCTION co2_storage_api.signup(IN the_password VARCHAR, IN the_account VARCHAR(255), IN issue_new_token BOOLEAN) RETURNS response_signup AS $signup$
	DECLARE
		accnt VARCHAR(255) DEFAULT NULL;
		signedup BOOLEAN DEFAULT NULL;
		tkn UUID DEFAULT NULL;
		tkn_validity TIMESTAMPTZ DEFAULT NULL;
		response response_signup;
	BEGIN
		SELECT "valid"
		INTO signedup
		FROM co2_storage_api.master_account
		WHERE "password" = crypt(the_password, "password");
		IF (signedup IS NOT NULL AND signedup = TRUE) THEN
			SELECT "account", "token", "token_validity"
			INTO accnt, tkn, tkn_validity
			FROM co2_storage_api.account
			WHERE "account" = the_account;
			IF (accnt IS NOT NULL) THEN
				tkn_validity = (now() + INTERVAL '1 YEAR');
				IF (issue_new_token IS NOT NULL AND issue_new_token = TRUE) THEN
					tkn = uuid_generate_v4();
					UPDATE co2_storage_api.account SET "token" = tkn WHERE "account" = the_account;
				END IF;
				UPDATE co2_storage_api.account SET "token_validity" = tkn_validity WHERE "account" = the_account;
			ELSE
				accnt = the_account;
				signedup = TRUE;
				tkn = uuid_generate_v4();
				tkn_validity = (now() + INTERVAL '1 YEAR');
				INSERT INTO co2_storage_api.account ("account", "token", "token_validity") VALUES (accnt, tkn, tkn_validity);
			END IF;
		ELSE
			accnt = the_account;
			signedup = FALSE;
			tkn = NULL;
			tkn_validity = NULL;
		END IF;
		response.account = accnt;
		response.signedup = signedup;
		response.token = tkn;
		response.token_validity = tkn_validity;
		return response;
	END;
$signup$ LANGUAGE plpgsql;
