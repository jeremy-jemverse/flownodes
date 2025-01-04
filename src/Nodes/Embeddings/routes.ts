import express from 'express';
import { processEmbeddings } from './index';
import { Router } from 'express';
import { PgVectorEmbeddingLoader } from './pgvector';
import { EmbeddingConfig } from './base';

const router = express.Router();

router.post('/test', async (req, res) => {
  const config: EmbeddingConfig = req.body;
  let loader: PgVectorEmbeddingLoader | null = null;

  try {
    loader = new PgVectorEmbeddingLoader(config);
    const testResults = await loader.test();
    res.json(testResults);
  } catch (error) {
    console.error('[Routes] Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (loader) {
      await loader.close();
    }
  }
});

router.post('/process', async (req, res) => {
  try {
    const result = await processEmbeddings(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

export default router;
