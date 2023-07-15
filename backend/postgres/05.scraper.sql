-- Contents
--
--DROP TABLE IF EXISTS co2_storage_scraper.contents;
CREATE TABLE IF NOT EXISTS co2_storage_scraper.contents (
	"id" SERIAL PRIMARY KEY,
	"chain_name" VARCHAR(255) DEFAULT 'sandbox',
	"data_structure" VARCHAR(25) NOT NULL,
	"version" VARCHAR(25) DEFAULT NULL,
	"scrape_time" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	"cid" VARCHAR(255) NOT NULL,
	"parent" VARCHAR(255) DEFAULT NULL,
	"name" VARCHAR(1024) NOT NULL,
	"description" TEXT DEFAULT NULL,
	"base" VARCHAR(1024) DEFAULT NULL,
	"reference" VARCHAR(255) DEFAULT NULL,
	"content_cid" VARCHAR(255) DEFAULT NULL,
	"content" TEXT DEFAULT NULL,
	"creator" VARCHAR(255) DEFAULT NULL,
	"protocol" VARCHAR(255) DEFAULT NULL,
	"license" VARCHAR(255) DEFAULT NULL,
	"timestamp" TIMESTAMPTZ DEFAULT NULL,
	"signature" VARCHAR(1024) DEFAULT NULL,
	"signature_method" VARCHAR(255) DEFAULT NULL,
	"signature_account" VARCHAR(255) DEFAULT NULL,
	"signature_verifying_contract" VARCHAR(255) DEFAULT NULL,
	"signature_chain_id" VARCHAR(255) DEFAULT NULL,
	"signature_cid" VARCHAR(255) DEFAULT NULL,
	"signature_v" SMALLINT DEFAULT NULL,
	"signature_r" VARCHAR(255) DEFAULT NULL,
	"signature_s" VARCHAR(255) DEFAULT NULL,
	"references" BIGINT DEFAULT 0,
	"uses" BIGINT DEFAULT 0,
	"full_text_search" TSVECTOR DEFAULT NULL,
	"ipfs_nodes" VARCHAR(1024)[] DEFAULT '{}',
	"archive" BOOLEAN DEFAULT FALSE,
	"archive_deals" VARCHAR(1024)[] DEFAULT '{}',
	"archived" TIMESTAMPTZ[] DEFAULT '{}',
	"restored" TIMESTAMPTZ[] DEFAULT '{}',
	"size" BIGINT DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS contents_id_idx ON co2_storage_scraper.contents ("id");
CREATE INDEX IF NOT EXISTS contents_chain_name_idx ON co2_storage_scraper.contents ("chain_name");
CREATE INDEX IF NOT EXISTS contents_data_structure_idx ON co2_storage_scraper.contents ("data_structure");
CREATE INDEX IF NOT EXISTS contents_cid_idx ON co2_storage_scraper.contents ("cid");
CREATE INDEX IF NOT EXISTS contents_name_idx ON co2_storage_scraper.contents ("name");
CREATE INDEX IF NOT EXISTS contents_base_idx ON co2_storage_scraper.contents ("base");
CREATE INDEX IF NOT EXISTS contents_reference_idx ON co2_storage_scraper.contents ("reference");
CREATE INDEX IF NOT EXISTS contents_creator_idx ON co2_storage_scraper.contents ("creator");
CREATE INDEX IF NOT EXISTS contents_protocol_idx ON co2_storage_scraper.contents ("protocol");
CREATE INDEX IF NOT EXISTS contents_license_idx ON co2_storage_scraper.contents ("license");
CREATE INDEX IF NOT EXISTS contents_full_text_search_ginidx ON co2_storage_scraper.contents USING GIN ("full_text_search");

-- Full text search update trigger after insert
--
DROP TRIGGER IF EXISTS contents_update_full_text_search_trigger ON co2_storage_scraper.contents;
CREATE TRIGGER contents_update_full_text_search_trigger AFTER INSERT OR UPDATE ON co2_storage_scraper.contents
	FOR EACH ROW
	WHEN (pg_trigger_depth() = 0)
	EXECUTE PROCEDURE co2_storage_helpers.update_full_text_search('co2_storage_scraper' , 'contents' , 'english' , 'full_text_search' , 'data_structure|||cid|||parent|||name|||description|||base|||creator|||content_cid|||content');

-- References counter update / trigger function
--
--DROP FUNCTION IF EXISTS co2_storage_scraper.update_references_counter();
CREATE OR REPLACE FUNCTION co2_storage_scraper.update_references_counter() RETURNS TRIGGER AS $update_references_counter$
	DECLARE
	BEGIN
		IF (NEW."reference" IS NOT NULL) THEN
			IF (NEW."data_structure" = 'template') THEN
				UPDATE co2_storage_scraper.contents SET "references" = "references" + 1 WHERE "cid" = NEW."reference";
			ELSEIF (NEW."data_structure" = 'asset') THEN
				UPDATE co2_storage_scraper.contents SET "uses" = "uses" + 1 WHERE "cid" = NEW."reference";
			END IF;
		END IF;
		RETURN NULL; -- result will be ignored since this is AFTER trigger function
	END;
$update_references_counter$ LANGUAGE plpgsql;

-- References counter update trigger after insert
--
DROP TRIGGER IF EXISTS contents_update_references_counter_trigger ON co2_storage_scraper.contents;
CREATE TRIGGER contents_update_references_counter_trigger AFTER INSERT OR UPDATE ON co2_storage_scraper.contents
	FOR EACH ROW
	WHEN (pg_trigger_depth() = 0)
	EXECUTE PROCEDURE co2_storage_scraper.update_references_counter();

-- Search through scraped caontents
--
DROP TYPE co2_storage_scraper.response_search_contents CASCADE;
CREATE TYPE co2_storage_scraper.response_search_contents AS (
	"chain_name" VARCHAR(255),
	"data_structure" VARCHAR(25),
	"version" VARCHAR(25),
	"scrape_time" TIMESTAMPTZ,
	"cid" VARCHAR(255),
	"parent" VARCHAR(255),
	"name" VARCHAR(1024),
	"description" TEXT,
	"base" VARCHAR(1024),
	"reference" VARCHAR(255),
	"content_cid" VARCHAR(255),
	"creator" VARCHAR(255),
	"protocol" VARCHAR(255),
	"license" VARCHAR(255),
	"timestamp" TIMESTAMPTZ,
	"signature" VARCHAR(1024),
	"signature_method" VARCHAR(255),
	"signature_account" VARCHAR(255),
	"signature_verifying_contract" VARCHAR(255),
	"signature_chain_id" VARCHAR(255),
	"signature_cid" VARCHAR(255),
	"signature_v" SMALLINT,
	"signature_r" VARCHAR(255),
	"signature_s" VARCHAR(255),
	"references" BIGINT,
	"uses" BIGINT,
	"size" BIGINT,
	"total" BIGINT);

--DROP FUNCTION IF EXISTS co2_storage_scraper.search_contents(IN the_search_phrases VARCHAR[], IN the_chain_name VARCHAR, IN the_data_structure VARCHAR, IN the_version VARCHAR, IN the_cid VARCHAR, IN the_parent VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_base VARCHAR, IN the_reference VARCHAR, IN the_content_cid VARCHAR, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_protocol VARCHAR, IN the_license VARCHAR, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5), IN the_or BOOLEAN);
CREATE OR REPLACE FUNCTION co2_storage_scraper.search_contents(IN the_search_phrases VARCHAR[], IN the_chain_name VARCHAR, IN the_data_structure VARCHAR, IN the_version VARCHAR, IN the_cid VARCHAR, IN the_parent VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_base VARCHAR, IN the_reference VARCHAR, IN the_content_cid VARCHAR, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_protocol VARCHAR, IN the_license VARCHAR, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5), IN the_or BOOLEAN) RETURNS SETOF co2_storage_scraper.response_search_contents AS $search_contents$
	DECLARE
		search_phrases_length SMALLINT = array_length(the_search_phrases, 1);
		search_phrases VARCHAR = '';
		counter_search_phrases SMALLINT = 1;
		count INTEGER DEFAULT 0;
		total_rows INTEGER DEFAULT 0;
		sql_str VARCHAR = '';
		concat_str VARCHAR = '';
		helper_str VARCHAR = '';
		and_or_or VARCHAR = 'AND';
		rcrd co2_storage_scraper.response_search_contents;
	BEGIN
		-- "and" or "or"
		IF (the_or IS NOT NULL AND the_or = TRUE) THEN
			and_or_or = 'OR';
		END IF; 
		-- pagining and sorting
		IF (the_offset IS NULL) THEN
			the_offset = 0;
		END IF;
		IF (the_limit IS NULL) THEN
			the_limit = 10;
		ELSEIF (the_limit > 100) THEN
			the_limit = 100;
		END IF;
		IF (the_sort_dir IS NULL) THEN
			the_sort_dir = 'ASC';
		END IF;
		IF (the_sort_by IS NULL) THEN
			the_sort_by = 'timestamp';
		END IF;

		sql_str = 'SELECT COUNT(DISTINCT(id))
			FROM co2_storage_scraper.contents
			WHERE TRUE
			%s;';

		IF (the_chain_name IS NOT NULL) THEN
			helper_str = ' AND LOWER("chain_name") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_chain_name, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_data_structure IS NOT NULL) THEN
			helper_str = ' AND LOWER("data_structure") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_data_structure, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_version IS NOT NULL) THEN
			helper_str = ' AND LOWER("version") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_version, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_created_from IS NOT NULL OR the_created_to IS NOT NULL) THEN
			IF (the_created_from IS NULL) THEN
				helper_str = ' AND "timestamp" <= %L ';
				helper_str = format(helper_str, the_created_to);
				concat_str = concat(concat_str, helper_str);
			ELSEIF (the_created_to IS NULL) THEN
				helper_str = ' AND "timestamp" >= %L ';
				helper_str = format(helper_str, the_created_from);
				concat_str = concat(concat_str, helper_str);
			ELSE
				helper_str = ' AND "timestamp" >= %L AND "timestamp" <= %L ';
				helper_str = format(helper_str, the_created_from, the_created_to);
				concat_str = concat(concat_str, helper_str);
			END IF;
		END IF;

		IF (the_protocol IS NOT NULL) THEN
			helper_str = ' AND LOWER("protocol") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_protocol, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_license IS NOT NULL) THEN
			helper_str = ' AND LOWER("license") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_license, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF(the_cid IS NOT NULL OR the_parent IS NOT NULL OR the_name IS NOT NULL OR the_description IS NOT NULL
			OR the_base IS NOT NULL OR the_reference IS NOT NULL OR the_content_cid IS NOT NULL OR the_creator IS NOT NULL) THEN
			IF (the_or IS NOT NULL AND the_or = TRUE) THEN
				concat_str = concat(concat_str, ' AND (FALSE ');
			ELSE
				concat_str = concat(concat_str, ' AND (TRUE ');
			END IF;
		END IF;

		-- constructing full text search sub-query per provided search phrases
		IF (search_phrases_length > 0) THEN
			search_phrases = concat(search_phrases, 'AND (');
			WHILE counter_search_phrases <= search_phrases_length LOOP
				IF (counter_search_phrases > 1) THEN
					search_phrases = concat(search_phrases, ' OR ');
				END IF;
				search_phrases = concat(search_phrases, format('"full_text_search" @@ phraseto_tsquery(%L)', translate(the_search_phrases[counter_search_phrases], '''', '')));
				counter_search_phrases = counter_search_phrases + 1;
			END LOOP;
			search_phrases = concat(search_phrases, ')');
		END IF;

		IF (search_phrases <> '') THEN
			concat_str = concat(concat_str, search_phrases);
		END IF;

		IF (the_cid IS NOT NULL) THEN
			helper_str = concat(' ', and_or_or, ' LOWER("cid") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_cid, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_parent IS NOT NULL) THEN
			helper_str = concat(' ', and_or_or, ' LOWER("parent") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_parent, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_name IS NOT NULL) THEN
			helper_str = concat(' ', and_or_or, ' LOWER("name") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_name, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_description IS NOT NULL) THEN
			helper_str = concat(' ', and_or_or, ' LOWER("description") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_description, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_base IS NOT NULL) THEN
			helper_str = concat(' ', and_or_or, ' LOWER("base") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_base, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_reference IS NOT NULL) THEN
			helper_str = concat(' ', and_or_or, ' LOWER("reference") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_reference, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_content_cid IS NOT NULL) THEN
			helper_str = concat(' ', and_or_or, ' LOWER("content_cid") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_content_cid, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_creator IS NOT NULL) THEN
			helper_str = concat(' ', and_or_or, ' LOWER("creator") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_creator, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF(the_cid IS NOT NULL OR the_parent IS NOT NULL OR the_name IS NOT NULL OR the_description IS NOT NULL
			OR the_base IS NOT NULL OR the_reference IS NOT NULL OR the_content_cid IS NOT NULL OR the_creator IS NOT NULL) THEN
			concat_str = concat(concat_str, ' )');
		END IF;

		EXECUTE format(sql_str, concat_str) INTO total_rows;

		-- resultset
		sql_str = 'SELECT "chain_name", "data_structure", "version", "scrape_time", "cid", "parent", "name", "description",
			"base", "reference", "content_cid", "creator", "protocol", "license", "timestamp", "signature", "signature_method", "signature_account",
			"signature_verifying_contract", "signature_chain_id", "signature_cid", "signature_v", "signature_r", "signature_s",
			"references", "uses", "size"
			FROM co2_storage_scraper.contents
			WHERE TRUE
			%s
			ORDER BY %I %s LIMIT %s OFFSET %s;';
		FOR rcrd IN
		EXECUTE format(sql_str, concat_str,
			the_sort_by, the_sort_dir, the_limit, the_offset
		) LOOP
		rcrd.total = total_rows;
		RETURN NEXT rcrd;
		END LOOP;
	END;
$search_contents$ LANGUAGE plpgsql;

-- List available data chains
--
DROP TYPE co2_storage_scraper.response_list_data_chains CASCADE;
CREATE TYPE co2_storage_scraper.response_list_data_chains AS ("chain_name" VARCHAR(255), "total" BIGINT);

--DROP FUNCTION IF EXISTS co2_storage_scraper.list_data_chains(IN the_offset INTEGER, IN the_limit INTEGER);
CREATE OR REPLACE FUNCTION co2_storage_scraper.list_data_chains(IN the_offset INTEGER, IN the_limit INTEGER) RETURNS SETOF co2_storage_scraper.response_list_data_chains AS $list_data_chains$
	DECLARE
		total_rows INTEGER DEFAULT 0;
		sql_str VARCHAR = '';
		rcrd co2_storage_scraper.response_list_data_chains;
	BEGIN
		-- pagining and sorting
		IF (the_offset IS NULL) THEN
			the_offset = 0;
		END IF;
		IF (the_limit IS NULL) THEN
			the_limit = 10;
		ELSEIF (the_limit > 100) THEN
			the_limit = 100;
		END IF;

		sql_str = 'SELECT COUNT(DISTINCT(chain_name))
			FROM co2_storage_scraper.contents;';

		EXECUTE format(sql_str) INTO total_rows;

		-- resultset
		sql_str = 'SELECT DISTINCT "chain_name"
			FROM co2_storage_scraper.contents
			ORDER BY chain_name ASC LIMIT %s OFFSET %s;';

		FOR rcrd IN
			EXECUTE format(sql_str,
				the_limit, the_offset
		) LOOP
		rcrd.total = total_rows;
		RETURN NEXT rcrd;
		END LOOP;
	END;
$list_data_chains$ LANGUAGE plpgsql;

DROP TYPE co2_storage_scraper.response_account_content_size CASCADE;
CREATE TYPE co2_storage_scraper.response_account_content_size AS (
	"creator" VARCHAR(255),
	"size" BIGINT);

--DROP FUNCTION IF EXISTS co2_storage_scraper.account_content_size(IN the_account VARCHAR(255), IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_scraper.account_content_size(IN the_account VARCHAR(255), IN the_token UUID) RETURNS co2_storage_scraper.response_account_content_size AS $account_content_size$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		sz BIGINT DEFAULT 0;
		response co2_storage_scraper.response_account_content_size;
	BEGIN
		-- authenticate
		SELECT "account", (LOWER("account") = LOWER(the_account)) AND ("authenticated" IS NOT NULL AND "authenticated")
		INTO accnt, auth
		FROM co2_storage_api.authenticate(the_token);
		-- get sum size
		SELECT "creator", sum(size) AS "size"
		INTO accnt, sz
		FROM co2_storage_scraper.contents
		WHERE LOWER("creator") = LOWER(the_account)
		AND "data_structure" = 'asset'
		GROUP BY "creator";
		response.creator = accnt;
		response.size = sz;
		return response;
	END;
$account_content_size$ LANGUAGE plpgsql;
