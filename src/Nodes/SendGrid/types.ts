export interface SendGridParameters {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export interface SendGridResponse {
  success: boolean;
  statusCode: number;
  message: string;
  response?: any;
}
