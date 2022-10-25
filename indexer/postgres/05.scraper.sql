-- Contents
--
--DROP TABLE IF EXISTS co2_storage_scraper.contents;
CREATE TABLE IF NOT EXISTS co2_storage_scraper.contents (
	"id" SERIAL PRIMARY KEY,
	"data_structure" VARCHAR(25) DEFAULT NULL,
	"version" VARCHAR(25) DEFAULT NULL,
	"last_scan" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	"cid" VARCHAR(255) DEFAULT NULL,
	"parent" VARCHAR(255) DEFAULT NULL,
	"name" VARCHAR(1024) DEFAULT NULL,
	"description" TEXT DEFAULT NULL,
	"base" VARCHAR(1024) DEFAULT NULL,
	"content_cid" VARCHAR(255) DEFAULT NULL,
	"creator" VARCHAR(255) DEFAULT NULL,
	"full_text_search" TSVECTOR DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS contents_id_idx ON co2_storage_scraper.contents ("id");
CREATE INDEX IF NOT EXISTS contents_data_structure_idx ON co2_storage_scraper.contents ("data_structure");
CREATE INDEX IF NOT EXISTS contents_name_idx ON co2_storage_scraper.contents ("name");
CREATE INDEX IF NOT EXISTS contents_base_idx ON co2_storage_scraper.contents ("base");
CREATE INDEX IF NOT EXISTS contents_creator_gistidx ON co2_storage_scraper.contents USING GIST ("creator");
CREATE INDEX IF NOT EXISTS contents_full_text_search_ginidx ON co2_storage_scraper.contents USING GIN ("full_text_search");

-- Full text search update trigger after insert
--
DROP TRIGGER IF EXISTS contents_update_full_text_search_trigger ON co2_storage_scraper.contents;
CREATE TRIGGER contents_update_full_text_search_trigger AFTER INSERT OR UPDATE ON co2_storage_scraper.contents
	FOR EACH ROW
	WHEN (pg_trigger_depth() = 0)
	EXECUTE PROCEDURE co2_storage_helpers.update_full_text_search('co2_storage_scraper' , 'contents' , 'english' , 'full_text_search' , 'data_structure|||cid|||parent|||name|||description|||base|||creator|||content_cid');

