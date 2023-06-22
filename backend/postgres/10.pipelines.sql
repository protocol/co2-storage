-- Pipelines
--
--DROP TABLE IF EXISTS co2_storage_api.pipelines;
CREATE TABLE IF NOT EXISTS co2_storage_api.pipelines (
	"id" SERIAL PRIMARY KEY,
	"protocol" VARCHAR(255) NOT NULL,
	"version" VARCHAR(255) NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"description" TEXT DEFAULT NULL,
	"cid" VARCHAR(255) DEFAULT NULL,
	"function_grid" JSONB DEFAULT NULL,
	"data_grid" JSONB DEFAULT NULL,
	"creator" VARCHAR(255) DEFAULT NULL,
	"timestamp" TIMESTAMPTZ DEFAULT NULL,
	"full_text_search" TSVECTOR DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS pipelines_id_idx ON co2_storage_api.pipelines ("id");
CREATE INDEX IF NOT EXISTS pipelines_name_idx ON co2_storage_api.pipelines ("name");
CREATE UNIQUE INDEX IF NOT EXISTS pipelines_cid_idx ON co2_storage_api.pipelines ("cid");
CREATE INDEX IF NOT EXISTS pipelines_creator_idx ON co2_storage_api.pipelines ("creator");
CREATE INDEX IF NOT EXISTS pipelines_full_text_search_ginidx ON co2_storage_api.pipelines USING GIN ("full_text_search");

-- Full text search update trigger after insert
--
DROP TRIGGER IF EXISTS pipelines_update_full_text_search_trigger ON co2_storage_api.pipelines;
CREATE TRIGGER pipelines_update_full_text_search_trigger AFTER INSERT OR UPDATE ON co2_storage_api.pipelines
	FOR EACH ROW
	WHEN (pg_trigger_depth() = 0)
	EXECUTE PROCEDURE co2_storage_helpers.update_full_text_search('co2_storage_api' , 'pipelines' , 'english' , 'full_text_search' , 'version|||name|||description|||cid|||creator');

-- Search pipelines
--
DROP TYPE co2_storage_api.response_search_pipelines CASCADE;
CREATE TYPE co2_storage_api.response_search_pipelines AS (
	"id" INTEGER,
	"protocol" VARCHAR(255),
	"version" VARCHAR(255),
	"name" VARCHAR(255),
	"description" TEXT,
	"cid" VARCHAR(255),
	"function_grid" JSONB,
	"data_grid" JSONB,
	"creator" VARCHAR(255),
	"timestamp" TIMESTAMPTZ,
	"total" INTEGER
);

--DROP FUNCTION IF EXISTS co2_storage_api.search_pipelines(IN the_search_phrases VARCHAR[], IN the_protocol VARCHAR, IN the_version VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_cid VARCHAR, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5));
CREATE OR REPLACE FUNCTION co2_storage_api.search_pipelines(IN the_search_phrases VARCHAR[], IN the_protocol VARCHAR, IN the_version VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_cid VARCHAR, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5)) RETURNS SETOF co2_storage_api.response_search_pipelines AS $search_pipelines$
	DECLARE
		search_phrases_length SMALLINT = array_length(the_search_phrases, 1);
		search_phrases VARCHAR = '';
		counter_search_phrases SMALLINT = 1;
		count INTEGER DEFAULT 0;
		total_rows INTEGER DEFAULT 0;
		sql_str VARCHAR = '';
		concat_str VARCHAR = '';
		helper_str VARCHAR = '';
		rcrd co2_storage_api.response_search_pipelines;
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
			the_sort_dir = 'DESC';
		END IF;
		IF (the_sort_by IS NULL) THEN
			the_sort_by = 'id';
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
			FROM co2_storage_api.pipelines
			WHERE TRUE
			%s;';

		IF (search_phrases <> '') THEN
			concat_str = search_phrases;
		END IF;

		IF (the_protocol IS NOT NULL) THEN
			helper_str = ' AND LOWER("protocol") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_protocol, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_version IS NOT NULL) THEN
			helper_str = ' AND LOWER("version") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_version, '%%'));
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

		IF (the_cid IS NOT NULL) THEN
			helper_str = ' AND LOWER("cid") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_cid, '%%'));
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

		EXECUTE format(sql_str, concat_str) INTO total_rows;

		-- resultset
		sql_str = 'SELECT "id", "protocol", "version", "name", "description", "cid", "function_grid", "data_grid", "creator", "timestamp"
			FROM co2_storage_api.pipelines
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
$search_pipelines$ LANGUAGE plpgsql;

