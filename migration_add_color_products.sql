-- ══════════════════════════════════════════════════════════════════
-- Migration: Adicionar campo COLOR à tabela products (Meus 3D)
-- Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#25f4f4';

-- Verificar que a coluna foi criada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'color';
