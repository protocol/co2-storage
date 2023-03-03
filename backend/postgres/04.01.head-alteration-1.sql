-- Head
--
-- Added archived to co2_storage_api.chain
ALTER TABLE co2_storage_api.chain
	ADD COLUMN "archived" BOOLEAN DEFAULT FALSE;