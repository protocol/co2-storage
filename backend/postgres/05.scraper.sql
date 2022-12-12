-- Contents
--
--DROP TABLE IF EXISTS co2_storage_scraper.contents;
CREATE TABLE IF NOT EXISTS co2_storage_scraper.contents (
	"id" SERIAL PRIMARY KEY,
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
	"timestamp" TIMESTAMPTZ DEFAULT NULL,
	"references" BIGINT DEFAULT 0,
	"uses" BIGINT DEFAULT 0,
	"full_text_search" TSVECTOR DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS contents_id_idx ON co2_storage_scraper.contents ("id");
CREATE INDEX IF NOT EXISTS contents_data_structure_idx ON co2_storage_scraper.contents ("data_structure");
CREATE INDEX IF NOT EXISTS contents_cid_idx ON co2_storage_scraper.contents ("cid");
CREATE INDEX IF NOT EXISTS contents_name_idx ON co2_storage_scraper.contents ("name");
CREATE INDEX IF NOT EXISTS contents_base_idx ON co2_storage_scraper.contents ("base");
CREATE INDEX IF NOT EXISTS contents_reference_idx ON co2_storage_scraper.contents ("reference");
CREATE INDEX IF NOT EXISTS contents_creator_idx ON co2_storage_scraper.contents ("creator");
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
DROP TYPE response_search_contents CASCADE;
CREATE TYPE response_search_contents AS (
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
	"timestamp" TIMESTAMPTZ,
	"references" BIGINT,
	"uses" BIGINT,
	"total" BIGINT);

--DROP FUNCTION IF EXISTS co2_storage_scraper.search_contents(IN the_search_phrases VARCHAR[], IN the_data_structure VARCHAR, IN the_version VARCHAR, IN the_cid VARCHAR, IN the_parent VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_reference VARCHAR, IN the_content_cid VARCHAR, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5));
CREATE OR REPLACE FUNCTION co2_storage_scraper.search_contents(IN the_search_phrases VARCHAR[], IN the_data_structure VARCHAR, IN the_version VARCHAR, IN the_cid VARCHAR, IN the_parent VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_reference VARCHAR, IN the_content_cid VARCHAR, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5)) RETURNS SETOF response_search_contents AS $search_contents$
	DECLARE
		search_phrases_length SMALLINT = array_length(the_search_phrases, 1);
		search_phrases VARCHAR = '';
		counter_search_phrases SMALLINT = 1;
		count INTEGER DEFAULT 0;
		total_rows INTEGER DEFAULT 0;
		sql_str VARCHAR = '';
		helper_str VARCHAR = '';
		rcrd response_search_contents;
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
			WHERE 1 = 1
			%s;';

		IF (search_phrases <> '') THEN
			helper_str = search_phrases;
		END IF;

		IF (the_data_structure IS NOT NULL) THEN
			helper_str = concat(helper_str, ' AND LOWER("data_structure") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_data_structure, '%%'));
		END IF;

		IF (the_version IS NOT NULL) THEN
			helper_str = concat(helper_str, ' AND LOWER("version") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_version, '%%'));
		END IF;

		IF (the_cid IS NOT NULL) THEN
			helper_str = concat(helper_str, ' AND LOWER("cid") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_cid, '%%'));
		END IF;

		IF (the_parent IS NOT NULL) THEN
			helper_str = concat(helper_str, ' AND LOWER("parent") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_parent, '%%'));
		END IF;

		IF (the_name IS NOT NULL) THEN
			helper_str = concat(helper_str, ' AND LOWER("name") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_name, '%%'));
		END IF;

		IF (the_description IS NOT NULL) THEN
			helper_str = concat(helper_str, ' AND LOWER("description") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_description, '%%'));
		END IF;

		IF (the_reference IS NOT NULL) THEN
			helper_str = concat(helper_str, ' AND LOWER("reference") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_reference, '%%'));
		END IF;

		IF (the_content_cid IS NOT NULL) THEN
			helper_str = concat(helper_str, ' AND LOWER("content_cid") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_content_cid, '%%'));
		END IF;

		IF (the_creator IS NOT NULL) THEN
			helper_str = concat(helper_str, ' AND LOWER("creator") LIKE LOWER(%L) ');
			helper_str = format(helper_str, concat('%%', the_creator, '%%'));
		END IF;

		IF (the_created_from IS NOT NULL OR the_created_to IS NOT NULL) THEN
			IF (the_created_from IS NULL) THEN
				helper_str = concat(helper_str, ' AND "timestamp" <= %L ');
				helper_str = format(helper_str, the_created_to);
			ELSEIF (the_created_to IS NULL) THEN
				helper_str = concat(helper_str, ' AND "timestamp" >= %L ');
				helper_str = format(helper_str, the_created_from);
			ELSE
				helper_str = concat(helper_str, ' AND "timestamp" >= %L AND "timestamp" <= %L ');
				helper_str = format(helper_str, the_created_from, the_created_to);
			END IF;
		END IF;

		EXECUTE format(sql_str, helper_str) INTO total_rows;

		-- resultset
		sql_str = 'SELECT "data_structure", "version", "scrape_time", "cid", "parent", "name", "description",
			"base", "reference", "content_cid", "creator", "timestamp", "references", "uses"
			FROM co2_storage_scraper.contents
			WHERE 1 = 1
			%s
			ORDER BY %I %s LIMIT %s OFFSET %s;';

		FOR rcrd IN
		EXECUTE format(sql_str, helper_str,
			the_sort_by, the_sort_dir, the_limit, the_offset
		) LOOP
		rcrd.total = total_rows;
		RETURN NEXT rcrd;
		END LOOP;
	END;
$search_contents$ LANGUAGE plpgsql;
