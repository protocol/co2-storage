-- Functions
--
--DROP TABLE IF EXISTS co2_storage_api.functions;
CREATE TABLE IF NOT EXISTS co2_storage_api.functions (
	"id" SERIAL PRIMARY KEY,
	"protocol" VARCHAR(255) NOT NULL,
	"version" VARCHAR(255) NOT NULL,
	"name" VARCHAR(255) NOT NULL,
	"description" TEXT DEFAULT NULL,
	"cid" VARCHAR(255) DEFAULT NULL,
	"function_type" VARCHAR(255) NOT NULL,
	"function_container" VARCHAR(1024) NOT NULL,
	"input_types" VARCHAR(255)[] DEFAULT '{}',
	"output_types" VARCHAR(255)[] DEFAULT '{}',
	"commands" TEXT DEFAULT NULL,
	"parameters" TEXT DEFAULT NULL,
	"creator" VARCHAR(255) DEFAULT NULL,
	"timestamp" TIMESTAMPTZ DEFAULT NULL,
	"uses" BIGINT DEFAULT 0,
	"full_text_search" TSVECTOR DEFAULT NULL,
	"retired" BOOLEAN DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS functions_id_idx ON co2_storage_api.functions ("id");
CREATE INDEX IF NOT EXISTS functions_name_idx ON co2_storage_api.functions ("name");
CREATE UNIQUE INDEX IF NOT EXISTS functions_cid_idx ON co2_storage_api.functions ("cid");
CREATE INDEX IF NOT EXISTS functions_function_type_idx ON co2_storage_api.functions ("function_type");
CREATE INDEX IF NOT EXISTS functions_function_container_idx ON co2_storage_api.functions ("function_container");
--CREATE UNIQUE INDEX IF NOT EXISTS functions_function_container_idx ON co2_storage_api.functions ("function_container");
CREATE INDEX IF NOT EXISTS functions_input_types_idx ON co2_storage_api.functions USING GIN ("input_types");
CREATE INDEX IF NOT EXISTS functions_output_types_idx ON co2_storage_api.functions USING GIN ("output_types");
CREATE INDEX IF NOT EXISTS functions_creator_idx ON co2_storage_api.functions ("creator");
CREATE INDEX IF NOT EXISTS functions_full_text_search_ginidx ON co2_storage_api.functions USING GIN ("full_text_search");

-- Full text search update trigger after insert
--
DROP TRIGGER IF EXISTS functions_update_full_text_search_trigger ON co2_storage_api.functions;
CREATE TRIGGER functions_update_full_text_search_trigger AFTER INSERT OR UPDATE ON co2_storage_api.functions
	FOR EACH ROW
	WHEN (pg_trigger_depth() = 0)
	EXECUTE PROCEDURE co2_storage_helpers.update_full_text_search('co2_storage_api' , 'functions' , 'english' , 'full_text_search' , 'version|||name|||description|||cid|||function_type|||function_container|||creator');

-- Search functions
--
DROP TYPE co2_storage_api.response_search_functions CASCADE;
CREATE TYPE co2_storage_api.response_search_functions AS (
	"id" INTEGER,
	"protocol" VARCHAR(255),
	"version" VARCHAR(255),
	"name" VARCHAR(255),
	"description" TEXT,
	"cid" VARCHAR(255),
	"function_type" VARCHAR(255),
	"function_container" VARCHAR(1024),
	"input_types" VARCHAR(255)[],
	"output_types" VARCHAR(255)[],
	"commands" TEXT,
	"parameters" TEXT,
	"retired" BOOLEAN,
	"creator" VARCHAR(255),
	"timestamp" TIMESTAMPTZ,
	"uses" BIGINT,
	"total" INTEGER
);

--DROP FUNCTION IF EXISTS co2_storage_api.search_functions(IN the_search_phrases VARCHAR[], IN the_protocol VARCHAR, IN the_version VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_cid VARCHAR, IN the_function_type VARCHAR, IN the_function_container VARCHAR, IN the_input_types VARCHAR[], IN the_output_types VARCHAR[], IN the_retired BOOLEAN, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5));
CREATE OR REPLACE FUNCTION co2_storage_api.search_functions(IN the_search_phrases VARCHAR[], IN the_protocol VARCHAR, IN the_version VARCHAR, IN the_name VARCHAR, IN the_description VARCHAR, IN the_cid VARCHAR, IN the_function_type VARCHAR, IN the_function_container VARCHAR, IN the_input_types VARCHAR[], IN the_output_types VARCHAR[], IN the_retired BOOLEAN, IN the_creator VARCHAR, IN the_created_from TIMESTAMPTZ, IN the_created_to TIMESTAMPTZ, IN the_offset INTEGER, IN the_limit INTEGER, IN the_sort_by VARCHAR(100), IN the_sort_dir VARCHAR(5)) RETURNS SETOF co2_storage_api.response_search_functions AS $search_functions$
	DECLARE
		search_phrases_length SMALLINT = array_length(the_search_phrases, 1);
		search_phrases VARCHAR = '';
		counter_search_phrases SMALLINT = 1;
		count INTEGER DEFAULT 0;
		total_rows INTEGER DEFAULT 0;
		sql_str VARCHAR = '';
		concat_str VARCHAR = '';
		helper_str VARCHAR = '';
		rcrd co2_storage_api.response_search_functions;
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
			FROM co2_storage_api.functions
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

		IF (the_function_type IS NOT NULL) THEN
			helper_str = ' AND LOWER("function_type") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_function_type, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_function_container IS NOT NULL) THEN
			helper_str = ' AND LOWER("function_container") LIKE LOWER(%L) ';
			helper_str = format(helper_str, concat('%%', the_function_container, '%%'));
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_input_types IS NOT NULL AND array_length(the_input_types, 1) > 0) THEN
			helper_str = ' AND %L @> "input_types" ';
			helper_str = format(helper_str, the_input_types);
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_output_types IS NOT NULL AND array_length(the_output_types, 1) > 0) THEN
			helper_str = ' AND %L @> "output_types" ';
			helper_str = format(helper_str, the_output_types);
			concat_str = concat(concat_str, helper_str);
		END IF;

		IF (the_retired IS NOT NULL) THEN
			helper_str = ' AND "retired" = %s ';
			helper_str = format(helper_str, concat('%%', the_retired, '%%'));
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
		sql_str = 'SELECT "id", "protocol", "version", "name", "description", "cid", "function_type", "function_container", "input_types", "output_types", "commands", "parameters", "retired", "creator", "timestamp", "uses"
			FROM co2_storage_api.functions
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
$search_functions$ LANGUAGE plpgsql;

