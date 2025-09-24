-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create video_leads table for storing video data and comments
CREATE TABLE IF NOT EXISTS video_leads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    comments TEXT NOT NULL,
    video_data BYTEA, -- Store video as binary data
    video_filename VARCHAR(255),
    video_content_type VARCHAR(100) DEFAULT 'video/webm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance on user queries
CREATE INDEX IF NOT EXISTS idx_video_leads_user_id ON video_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_video_leads_created_at ON video_leads(created_at DESC);