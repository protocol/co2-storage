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

DROP FUNCTION IF EXISTS co2_storage_scraper.search_contents(IN the_search_phrases VARCHAR[], IN the_chain_name VARCHAR, IN the_data_structure VARCHAR, IN the_version VARCHAR, IN the_cid VARCHAR, IN the_parent VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_base VARCHAR, IN the_reference VARCHAR, IN the_content_cid VARCHAR, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5));
CREATE OR REPLACE FUNCTION co2_storage_scraper.search_contents(IN the_search_phrases VARCHAR[], IN the_chain_name VARCHAR, IN the_data_structure VARCHAR, IN the_version VARCHAR, IN the_cid VARCHAR, IN the_parent VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_base VARCHAR, IN the_reference VARCHAR, IN the_content_cid VARCHAR, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_protocol VARCHAR, IN the_license VARCHAR, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5)) RETURNS SETOF co2_storage_scraper.response_search_contents AS $search_contents$
	DECLARE
		search_phrases_length SMALLINT = array_length(the_search_phrases, 1);
		search_phrases VARCHAR = '';
		counter_search_phrases SMALLINT = 1;
		count INTEGER DEFAULT 0;
		total_rows INTEGER DEFAULT 0;
		sql_str VARCHAR = '';
		concat_str VARCHAR = '';
		helper_str VARCHAR = '';
		rcrd co2_storage_scraper.response_search_contents;
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
		IF (the_sort_dir IS NULL) THEN
			the_sort_dir = 'ASC';
		END IF;
		IF (the_sort_by IS NULL) THEN
			the_sort_by = 'timestamp';
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

		sql_str = 'SELECT COUNT(DISTINCT(id))
			FROM co2_storage_scraper.contents
			WHERE TRUE
			%s;';

		IF (search_phrases <> '') THEN
			concat_str = search_phrases;
		END IF;

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

		IF (the_cid IS NOT NULL) THEN
			helper_str = ' AND LOWER("cid") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_cid, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_parent IS NOT NULL) THEN
			helper_str = ' AND LOWER("parent") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_parent, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_name IS NOT NULL) THEN
			helper_str = ' AND LOWER("name") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_name, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_description IS NOT NULL) THEN
			helper_str = ' AND LOWER("description") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_description, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_base IS NOT NULL) THEN
			helper_str = ' AND LOWER("base") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_base, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_reference IS NOT NULL) THEN
			helper_str = ' AND LOWER("reference") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_reference, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_content_cid IS NOT NULL) THEN
			helper_str = ' AND LOWER("content_cid") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_content_cid, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_creator IS NOT NULL) THEN
			helper_str = ' AND LOWER("creator") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_creator, '%%'));
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

DROP TYPE co2_storage_scraper.response_account_content_size CASCADE;
CREATE TYPE co2_storage_scraper.response_account_content_size AS (
	"creator" VARCHAR(255),
	"size" BIGINT);

DROP FUNCTION IF EXISTS co2_storage_scraper.account_content_size(IN the_account VARCHAR(255), IN the_token UUID);
CREATE OR REPLACE FUNCTION co2_storage_scraper.account_content_size(IN the_account VARCHAR(255), IN the_token UUID) RETURNS co2_storage_scraper.response_account_content_size AS $account_content_size$
	DECLARE
		auth BOOLEAN DEFAULT NULL;
		accnt VARCHAR(255) DEFAULT NULL;
		sz BIGINT DEFAULT 0;
		response co2_storage_scraper.response_account_content_size;
	BEGIN
		-- authenticate
		SELECT "account", ("account" = the_account) AND ("authenticated" IS NOT NULL AND "authenticated")
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
