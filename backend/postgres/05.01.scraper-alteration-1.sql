-- Contents
--
-- Adding pinning_node, replication_nodes, archive, archive_deals
-- archived, restored and size to co2_storage_scraper.contents
--
-- Adding contents_pinning_node_idx to indexes
ALTER TABLE co2_storage_scraper.contents
	ADD COLUMN "ipfs_nodes" VARCHAR(1024)[] DEFAULT '{}',
	ADD COLUMN "archive" BOOLEAN DEFAULT FALSE,
	ADD COLUMN "archive_deals" VARCHAR(1024)[] DEFAULT '{}',
	ADD COLUMN "archived" TIMESTAMPTZ[] DEFAULT '{}',
	ADD COLUMN "restored" TIMESTAMPTZ[] DEFAULT '{}',
	ADD COLUMN "size" BIGINT DEFAULT NULL;
