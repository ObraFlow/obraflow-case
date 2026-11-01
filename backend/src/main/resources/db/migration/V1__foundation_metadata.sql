CREATE TABLE app_metadata (
    metadata_key VARCHAR(64) PRIMARY KEY,
    metadata_value VARCHAR(255) NOT NULL
);

INSERT INTO app_metadata (metadata_key, metadata_value)
VALUES ('application', 'ObraFlow');
