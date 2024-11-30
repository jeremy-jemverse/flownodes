import { Pool, PoolClient } from 'pg';
import {
  PostgresConnectionDetails,
  PostgresExecuteQueryParams,
  PostgresSelectParams,
  PostgresInsertParams,
  PostgresUpdateParams,
  PostgresDeleteParams,
  PostgresResponse
} from './types';

export class Postgres {
  private async getClient(connectionDetails: PostgresConnectionDetails): Promise<PoolClient> {
    const pool = new Pool({
      host: connectionDetails.host,
      port: connectionDetails.port,
      user: connectionDetails.user,
      password: connectionDetails.password,
      database: connectionDetails.database,
      ssl: connectionDetails.ssl ? { rejectUnauthorized: false } : undefined,
      max: 1 // Use a single connection per request
    });

    try {
      const client = await pool.connect();
      const release = client.release;
      // Override pool release to close the pool after release
      client.release = () => {
        release.apply(client);
        return pool.end();
      };
      return client;
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  private async executeWithClient(
    client: PoolClient,
    query: string,
    params?: any[]
  ): Promise<any> {
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      await client.release();
    }
  }

  private buildWhereClause(conditions: Record<string, any>): { text: string; values: any[] } {
    const values: any[] = [];
    const clauses: string[] = [];

    Object.entries(conditions).forEach(([key, value], index) => {
      if (value === null) {
        clauses.push(`${key} IS NULL`);
      } else {
        values.push(value);
        clauses.push(`${key} = $${values.length}`);
      }
    });

    return {
      text: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      values
    };
  }

  public async executeQuery(params: PostgresExecuteQueryParams): Promise<PostgresResponse> {
    const client = await this.getClient(params.connectionDetails);
    try {
      const rows = await this.executeWithClient(client, params.query, params.params);
      return {
        success: true,
        statusCode: 200,
        message: 'Query executed successfully',
        data: rows
      };
    } catch (error) {
      console.error('Error executing query:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to execute query',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async select(params: PostgresSelectParams): Promise<PostgresResponse> {
    const client = await this.getClient(params.connectionDetails);
    try {
      const columns = params.columns?.join(', ') || '*';
      const where = params.conditions ? this.buildWhereClause(params.conditions) : { text: '', values: [] };
      const orderBy = params.orderBy ? `ORDER BY ${params.orderBy}` : '';
      const limit = params.limit ? `LIMIT ${params.limit}` : '';
      const offset = params.offset ? `OFFSET ${params.offset}` : '';

      const query = `
        SELECT ${columns}
        FROM ${params.tableName}
        ${where.text}
        ${orderBy}
        ${limit}
        ${offset}
      `;

      const rows = await this.executeWithClient(client, query, where.values);
      return {
        success: true,
        statusCode: 200,
        message: 'Select query executed successfully',
        data: rows
      };
    } catch (error) {
      console.error('Error executing select query:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to execute select query',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async insert(params: PostgresInsertParams): Promise<PostgresResponse> {
    const client = await this.getClient(params.connectionDetails);
    try {
      if (params.data.length === 0) {
        return {
          success: false,
          statusCode: 400,
          message: 'No data provided for insertion'
        };
      }

      const columns = Object.keys(params.data[0]);
      const values = params.data.map(row => columns.map(col => row[col]));
      const placeholders = values.map((_, rowIndex) =>
        `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
      ).join(', ');

      const query = `
        INSERT INTO ${params.tableName} (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING *
      `;

      const flatValues = values.flat();
      const rows = await this.executeWithClient(client, query, flatValues);
      return {
        success: true,
        statusCode: 201,
        message: 'Data inserted successfully',
        data: rows
      };
    } catch (error) {
      console.error('Error executing insert query:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to insert data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async update(params: PostgresUpdateParams): Promise<PostgresResponse> {
    const client = await this.getClient(params.connectionDetails);
    try {
      const setValues: any[] = [];
      const setClauses = Object.entries(params.data).map(([key, value], index) => {
        setValues.push(value);
        return `${key} = $${index + 1}`;
      });

      const where = this.buildWhereClause(params.conditions);
      const values = [...setValues, ...where.values];

      const query = `
        UPDATE ${params.tableName}
        SET ${setClauses.join(', ')}
        ${where.text}
        RETURNING *
      `;

      const rows = await this.executeWithClient(client, query, values);
      return {
        success: true,
        statusCode: 200,
        message: 'Data updated successfully',
        data: rows
      };
    } catch (error) {
      console.error('Error executing update query:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to update data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async delete(params: PostgresDeleteParams): Promise<PostgresResponse> {
    const client = await this.getClient(params.connectionDetails);
    try {
      const where = this.buildWhereClause(params.conditions);
      const query = `
        DELETE FROM ${params.tableName}
        ${where.text}
        RETURNING *
      `;

      const rows = await this.executeWithClient(client, query, where.values);
      return {
        success: true,
        statusCode: 200,
        message: 'Data deleted successfully',
        data: rows
      };
    } catch (error) {
      console.error('Error executing delete query:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to delete data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
