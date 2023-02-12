-- Full text search update / trigger function
--
--DROP FUNCTION IF EXISTS co2_storage_helpers.update_full_text_search();
CREATE OR REPLACE FUNCTION co2_storage_helpers.update_full_text_search() RETURNS TRIGGER AS $update_full_text_search$
	DECLARE
		considered_columns VARCHAR[] = regexp_split_to_array(TG_ARGV[4], '\|\|\|');
		counter SMALLINT = 1;
		no_of_columns SMALLINT = array_length(considered_columns , 1);
		fts VARCHAR = '';
	BEGIN
		WHILE counter <= no_of_columns LOOP
			fts = concat(fts, format(' COALESCE(translate(NULLIF(cast("%s" AS TEXT),''''),''/.-*'',''    ''),'''') ', considered_columns[counter]));
			IF (counter < no_of_columns) THEN
				fts = concat(fts, ' || '' '' || ');
			END IF;
			counter = counter + 1;
		END LOOP;
		EXECUTE format('UPDATE %s SET %s = to_tsvector(''%s'', %s) WHERE "id" = ''%s'';', concat('"', TG_ARGV[0], '"."', TG_ARGV[1], '"'), concat('"', TG_ARGV[3], '"'), TG_ARGV[2], fts, NEW.id);
		RETURN NULL; -- result will be ignored since this is AFTER trigger function
	END;
$update_full_text_search$ LANGUAGE plpgsql;
