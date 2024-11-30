export interface PostgresConnectionDetails {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
}

export interface PostgresExecuteQueryParams {
  connectionDetails: PostgresConnectionDetails;
  query: string;
  params?: any[];
}

export interface PostgresSelectParams {
  connectionDetails: PostgresConnectionDetails;
  tableName: string;
  columns?: string[];
  conditions?: Record<string, any>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface PostgresInsertParams {
  connectionDetails: PostgresConnectionDetails;
  tableName: string;
  data: Record<string, any>[];
}

export interface PostgresUpdateParams {
  connectionDetails: PostgresConnectionDetails;
  tableName: string;
  data: Record<string, any>;
  conditions: Record<string, any>;
}

export interface PostgresDeleteParams {
  connectionDetails: PostgresConnectionDetails;
  tableName: string;
  conditions: Record<string, any>;
}

export interface PostgresResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: any;
  error?: any;
}
