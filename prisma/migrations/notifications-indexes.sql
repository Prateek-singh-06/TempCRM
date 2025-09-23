-- Migration to add indexes to notifications table for better performance
-- This should be run in your database migration tool

-- Add index on userId for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(userId);

-- Add index on isRead for faster unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(isRead);

-- Add index on createdAt for faster sorting
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(createdAt);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(userId, isRead);

-- Add index on type for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);