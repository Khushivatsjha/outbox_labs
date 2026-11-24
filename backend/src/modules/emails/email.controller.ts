import { Request, Response } from 'express';
import { emailService } from './email.service';
import { CreateEmailSchema, EmailQuerySchema, EmailIdParamSchema } from './email.validation';

export class EmailController {
  schedule = async (req: Request, res: Response) => {
    const validatedInput = CreateEmailSchema.parse(req.body);
    const email = await emailService.scheduleEmail(validatedInput);

    res.status(201).json({
      success: true,
      message: 'Email successfully scheduled',
      data: email,
    });
  };

  list = async (req: Request, res: Response) => {
    const query = EmailQuerySchema.parse(req.query);
    const result = await emailService.listEmails(query);

    res.status(200).json({
      success: true,
      data: {
        emails: result.emails,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    });
  };

  getById = async (req: Request, res: Response) => {
    const { id } = EmailIdParamSchema.parse(req.params);
    const email = await emailService.getEmailById(id);

    res.status(200).json({
      success: true,
      data: email,
    });
  };

  getStats = async (_req: Request, res: Response) => {
    const stats = await emailService.getStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  };

  getEvents = async (req: Request, res: Response) => {
    const { id } = EmailIdParamSchema.parse(req.params);
    const events = await emailService.getEvents(id);

    res.status(200).json({
      success: true,
      data: events,
    });
  };

  cancel = async (req: Request, res: Response) => {
    const { id } = EmailIdParamSchema.parse(req.params);
    const email = await emailService.cancelEmail(id);

    res.status(200).json({
      success: true,
      message: 'Email successfully cancelled',
      data: email,
    });
  };
}

export const emailController = new EmailController();
