// Common parameters for all email types
interface SendGridBaseParameters {
  apiKey: string;
  to: string | string[];
  from: string;
  subject: string;
}

// Parameters for body-based emails
export interface SendGridBodyParameters extends SendGridBaseParameters {
  type: 'body';
  text?: string;
  html?: string;
}

// Parameters for template-based emails
export interface SendGridTemplateParameters extends SendGridBaseParameters {
  type: 'template';
  templateId: string;
  dynamicTemplateData?: Record<string, any>;
}

// Union type for all possible parameters
export type SendGridParameters = SendGridBodyParameters | SendGridTemplateParameters;

export interface SendGridResponse {
  success: boolean;
  statusCode: number;
  message: string;
  response?: {
    headers: Record<string, string>;
    body: any;
  };
  error?: {
    message?: string;
    code?: string;
    field?: string;
    help?: string;
    response?: {
      headers?: Record<string, string>;
      body?: any;
    };
  };
}
