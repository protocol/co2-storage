-- Auth / Profile
--
-- Adding name and data license to co2_storage_api.accounts
ALTER TABLE co2_storage_api.accounts
	ADD COLUMN "name" VARCHAR(255) DEFAULT NULL,
	ADD COLUMN "default_data_license" VARCHAR(255) DEFAULT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS account_name_idx ON co2_storage_api.accounts ("name");
CREATE INDEX IF NOT EXISTS account_default_data_license_idx ON co2_storage_api.accounts ("default_data_license");

DROP TYPE co2_storage_api.response_authenticate CASCADE;
CREATE TYPE co2_storage_api.response_authenticate AS (account VARCHAR(255), "name" VARCHAR(255),
	default_data_license VARCHAR(255), authenticated BOOLEAN, token UUID, validity TIMESTAMPTZ);

DROP FUNCTION IF EXISTS co2_storage_api.authenticate(IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.authenticate(IN the_token UUID) RETURNS co2_storage_api.response_authenticate AS $authenticate$
	DECLARE
		accnt VARCHAR(255) DEFAULT NULL;
		nm VARCHAR(255) DEFAULT NULL;
		ddl VARCHAR(255) DEFAULT NULL;
		authenticated BOOLEAN DEFAULT NULL;
		tkn UUID DEFAULT NULL;
		tkn_validity TIMESTAMPTZ DEFAULT NULL;
		response co2_storage_api.response_authenticate;
	BEGIN
		SELECT "account", "name", "default_data_license", "token", ("token" = the_token AND "token_validity" >= now())
		INTO accnt, nm, ddl, tkn, authenticated
		FROM co2_storage_api.accounts
		WHERE "token" = the_token;
		IF (authenticated IS NOT NULL AND authenticated = TRUE) THEN
			tkn_validity = (now() + INTERVAL '1 YEAR');
		ELSE
			authenticated = FALSE;
			tkn = NULL;
			tkn_validity = CURRENT_TIMESTAMP;
		END IF;
		IF (tkn IS NOT NULL) THEN
			UPDATE co2_storage_api.accounts SET "token_validity" = tkn_validity WHERE "token" = tkn;
		END IF;
		response.account = accnt;
		response.name = nm;
		response.default_data_license = ddl;
		response.authenticated = authenticated;
		response.token = tkn;
		response.validity = tkn_validity;
		return response;
	END;
$authenticate$ LANGUAGE plpgsql;

-- Update profile name
--
DROP TYPE co2_storage_api.response_update_profile_name CASCADE;
CREATE TYPE co2_storage_api.response_update_profile_name AS (account VARCHAR(255), ts TIMESTAMPTZ, updated BOOLEAN);

--DROP FUNCTION IF EXISTS co2_storage_api.update_profile_name(IN the_profile_name VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.update_profile_name(IN the_profile_name VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID) RETURNS co2_storage_api.response_update_profile_name AS $update_profile_name$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		updated BOOLEAN DEFAULT NULL;
		response co2_storage_api.response_update_profile_name;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			-- update profile name
			UPDATE co2_storage_api.accounts SET "name" = the_profile_name WHERE "account" = accnt;
			updated = TRUE;
		ELSE
			updated = FALSE;
		END IF;
		response.account = accnt;
		response.ts = CURRENT_TIMESTAMP;
		response.updated = updated;
		return response;
	END;
$update_profile_name$ LANGUAGE plpgsql;

-- Update profile default data license
--
DROP TYPE co2_storage_api.response_update_profile_default_data_license CASCADE;
CREATE TYPE co2_storage_api.response_update_profile_default_data_license AS (account VARCHAR(255), ts TIMESTAMPTZ, updated BOOLEAN);

--DROP FUNCTION IF EXISTS co2_storage_api.update_profile_default_data_license(IN the_default_data_license VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_api.update_profile_default_data_license(IN the_default_data_license VARCHAR(255), IN the_account VARCHAR(255), IN the_token UUID) RETURNS co2_storage_api.response_update_profile_default_data_license AS $update_profile_default_data_license$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		updated BOOLEAN DEFAULT NULL;
		response co2_storage_api.response_update_profile_default_data_license;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		IF (auth IS NOT NULL AND auth = TRUE) THEN
			-- update profile default data license
			UPDATE co2_storage_api.accounts SET "default_data_license" = the_default_data_license WHERE "account" = accnt;
			updated = TRUE;
		ELSE
			updated = FALSE;
		END IF;
		response.account = accnt;
		response.ts = CURRENT_TIMESTAMP;
		response.updated = updated;
		return response;
	END;
$update_profile_default_data_license$ LANGUAGE plpgsql;
