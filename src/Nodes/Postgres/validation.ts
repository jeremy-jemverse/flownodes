import * as Joi from 'joi';

export const connectionDetailsSchema = Joi.object({
  host: Joi.string().required(),
  port: Joi.number().port().required(),
  user: Joi.string().required(),
  password: Joi.string().required(),
  database: Joi.string().required(),
  ssl: Joi.boolean().optional()
});

export const executeQuerySchema = Joi.object({
  connectionDetails: connectionDetailsSchema.required(),
  query: Joi.string().required(),
  params: Joi.array().items(Joi.any()).optional()
});

export const selectSchema = Joi.object({
  connectionDetails: connectionDetailsSchema.required(),
  tableName: Joi.string().required(),
  columns: Joi.array().items(Joi.string()).optional(),
  conditions: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  orderBy: Joi.string().optional(),
  limit: Joi.number().integer().min(1).optional(),
  offset: Joi.number().integer().min(0).optional()
});

export const insertSchema = Joi.object({
  connectionDetails: connectionDetailsSchema.required(),
  tableName: Joi.string().required(),
  data: Joi.array().items(Joi.object().pattern(Joi.string(), Joi.any())).min(1).required()
});

export const updateSchema = Joi.object({
  connectionDetails: connectionDetailsSchema.required(),
  tableName: Joi.string().required(),
  data: Joi.object().pattern(Joi.string(), Joi.any()).required(),
  conditions: Joi.object().pattern(Joi.string(), Joi.any()).required()
});

export const deleteSchema = Joi.object({
  connectionDetails: connectionDetailsSchema.required(),
  tableName: Joi.string().required(),
  conditions: Joi.object().pattern(Joi.string(), Joi.any()).required()
});
