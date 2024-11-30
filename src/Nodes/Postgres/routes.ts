import { Router } from 'express';
import { Postgres } from './Postgres';
import {
  executeQuerySchema,
  selectSchema,
  insertSchema,
  updateSchema,
  deleteSchema
} from './validation';

const router = Router();
const postgres = new Postgres();

// Execute raw SQL query
router.post('/execute-query', async (req, res) => {
  try {
    const { error, value } = executeQuerySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: error.details[0].message
      });
    }

    const response = await postgres.executeQuery(value);
    res.status(response.success ? 200 : response.statusCode).json(response);
  } catch (error) {
    console.error('Error in execute-query endpoint:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Select rows
router.post('/select-rows', async (req, res) => {
  try {
    const { error, value } = selectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: error.details[0].message
      });
    }

    const response = await postgres.select(value);
    res.status(response.success ? 200 : response.statusCode).json(response);
  } catch (error) {
    console.error('Error in select-rows endpoint:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Insert rows
router.post('/insert-rows', async (req, res) => {
  try {
    const { error, value } = insertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: error.details[0].message
      });
    }

    const response = await postgres.insert(value);
    res.status(response.success ? 201 : response.statusCode).json(response);
  } catch (error) {
    console.error('Error in insert-rows endpoint:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Update rows
router.post('/update-rows', async (req, res) => {
  try {
    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: error.details[0].message
      });
    }

    const response = await postgres.update(value);
    res.status(response.success ? 200 : response.statusCode).json(response);
  } catch (error) {
    console.error('Error in update-rows endpoint:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Delete rows
router.post('/delete-rows', async (req, res) => {
  try {
    const { error, value } = deleteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: error.details[0].message
      });
    }

    const response = await postgres.delete(value);
    res.status(response.success ? 200 : response.statusCode).json(response);
  } catch (error) {
    console.error('Error in delete-rows endpoint:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
