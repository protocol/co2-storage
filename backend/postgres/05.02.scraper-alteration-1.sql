-- Contents
--
-- Adding protocol and license to co2_storage_scraper.contents
ALTER TABLE co2_storage_scraper.contents
	ADD COLUMN "protocol" VARCHAR(255) DEFAULT NULL,
	ADD COLUMN "license" VARCHAR(255) DEFAULT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS contents_protocol_idx ON co2_storage_scraper.contents ("protocol");
CREATE INDEX IF NOT EXISTS contents_license_idx ON co2_storage_scraper.contents ("license");
