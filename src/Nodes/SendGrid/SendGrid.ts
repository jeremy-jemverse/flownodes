import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SendGridParameters, SendGridResponse, SendGridBodyParameters, SendGridTemplateParameters } from './types';

export class SendGrid {
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private formatEmailAddress(email: string, name?: string): string {
    if (!this.validateEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }
    return name ? `${name} <${email}>` : email;
  }

  private formatRecipients(to: string | string[]): string[] {
    const recipients = Array.isArray(to) ? to : [to];
    return recipients.map(recipient => this.formatEmailAddress(recipient));
  }

  private validateParameters(params: any): void {
    console.log('[SendGrid] Validating parameters:', JSON.stringify(params, null, 2));
    
    if (!params.config?.connection?.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    if (!params.config?.email?.from) {
      throw new Error('From email is required');
    }

    if (!params.config?.email?.to) {
      throw new Error('To email is required');
    }

    if (!params.config?.email?.type) {
      throw new Error('Email type is required');
    }

    if (params.config.email.type === 'template' && !params.config.email.templateId) {
      throw new Error('Template ID is required for template emails');
    }

    if (params.config.email.type === 'body' && !params.config.email.body) {
      throw new Error('Email body is required for body emails');
    }
  }

  private formatRequestBody(params: any): any {
    console.log('[SendGrid] Formatting request body');
    const { config } = params;
    const { email } = config;

    const msg = {
      to: this.formatRecipients(email.to),
      from: this.formatEmailAddress(email.from),
      subject: email.subject?.trim(),
    };

    if (email.type === 'template') {
      console.log('[SendGrid] Processing template email');
      return {
        ...msg,
        templateId: email.templateId,
        dynamicTemplateData: email.dynamicTemplateData
      };
    } else {
      console.log('[SendGrid] Processing body email');
      return {
        ...msg,
        text: email.body?.text,
        html: email.body?.html
      };
    }
  }

  public async execute(params: any): Promise<any> {
    try {
      console.log('[SendGrid] Starting execution');
      
      // Validate all parameters
      this.validateParameters(params);
      
      // Format the request body
      const requestBody = this.formatRequestBody(params);
      console.log('[SendGrid] Request body prepared:', JSON.stringify(requestBody, null, 2));

      // Set API key
      sgMail.setApiKey(params.config.connection.apiKey);
      console.log('[SendGrid] API key set');

      // Send email
      console.log('[SendGrid] Sending email');
      await sgMail.send(requestBody);
      console.log('[SendGrid] Email sent successfully');

      return {
        success: true,
        message: 'Email sent successfully'
      };

    } catch (error) {
      console.error('[SendGrid] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(message);
    }
  }
}
