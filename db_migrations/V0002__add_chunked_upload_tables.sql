-- Таблица для отслеживания многочастных загрузок
CREATE TABLE IF NOT EXISTS chunked_uploads (
    upload_id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    title TEXT,
    comments TEXT,
    total_size BIGINT NOT NULL,
    total_chunks INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для хранения частей загрузки
CREATE TABLE IF NOT EXISTS upload_chunks (
    upload_id VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_data BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (upload_id, chunk_index)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_chunked_uploads_user_id ON chunked_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_chunked_uploads_status ON chunked_uploads(status);
CREATE INDEX IF NOT EXISTS idx_upload_chunks_upload_id ON upload_chunks(upload_id);