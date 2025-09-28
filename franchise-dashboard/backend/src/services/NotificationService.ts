import { Repository } from 'typeorm';
import { Twilio } from 'twilio';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { 
  Notification, 
  NotificationChannel, 
  NotificationStatus, 
  NotificationType 
} from '../models/Notification';
import { Case } from '../models/Case';
import { Company } from '../models/Company';
import { SalesAccount } from '../models/SalesAccount';
import { AppDataSource } from '../config/database';
import { Redis } from '../config/redis';

interface NotificationRequest {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  recipientName?: string;
  subject?: string;
  message?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  caseId?: string;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private notificationRepository: Repository<Notification>;
  private twilioClient: Twilio;
  private emailTransporter: nodemailer.Transporter;
  private redis: Redis;

  constructor() {
    this.notificationRepository = AppDataSource.getRepository(Notification);
    this.redis = Redis.getInstance();

    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async createNotification(request: NotificationRequest): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...request,
      status: NotificationStatus.PENDING,
    });

    const saved = await this.notificationRepository.save(notification);

    // If not scheduled, send immediately
    if (!request.scheduledFor || request.scheduledFor <= new Date()) {
      await this.sendNotification(saved.id);
    } else {
      // Schedule for later (in production, use a job queue)
      await this.scheduleNotification(saved);
    }

    return saved;
  }

  async sendNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['case'],
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.status !== NotificationStatus.PENDING) {
      return; // Already processed
    }

    try {
      switch (notification.channel) {
        case NotificationChannel.SMS:
          await this.sendSMS(notification);
          break;
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationChannel.LINE:
          await this.sendLINE(notification);
          break;
      }
    } catch (error) {
      notification.markAsFailed(error.message);
      await this.notificationRepository.save(notification);
      
      // Retry if applicable
      if (notification.shouldRetry()) {
        notification.incrementRetryCount();
        await this.notificationRepository.save(notification);
        
        // Schedule retry (exponential backoff)
        const retryDelay = Math.pow(2, notification.metadata.retryCount) * 60000;
        setTimeout(() => this.sendNotification(notificationId), retryDelay);
      }
    }
  }

  private async sendSMS(notification: Notification): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    const message = await this.twilioClient.messages.create({
      body: notification.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: notification.recipient,
    });

    notification.markAsSent(message.sid, { 
      status: message.status,
      dateCreated: message.dateCreated,
    });

    await this.notificationRepository.save(notification);
  }

  private async sendEmail(notification: Notification): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@franchise.com',
      to: notification.recipient,
      subject: notification.subject || 'Notification from Franchise System',
      text: notification.message,
      html: this.formatEmailHTML(notification),
    };

    const info = await this.emailTransporter.sendMail(mailOptions);

    notification.markAsSent(info.messageId, { 
      accepted: info.accepted,
      rejected: info.rejected,
    });

    await this.notificationRepository.save(notification);
  }

  private async sendLINE(notification: Notification): Promise<void> {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE service not configured');
    }

    const response = await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: notification.recipient,
        messages: [{
          type: 'text',
          text: notification.message,
        }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    notification.markAsSent(response.data.messageId, response.data);
    await this.notificationRepository.save(notification);
  }

  private formatEmailHTML(notification: Notification): string {
    // Basic HTML template
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f4f4f4; }
          .footer { text-align: center; padding: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>外壁塗装くらべるAI - 加盟店管理システム</h2>
          </div>
          <div class="content">
            <p>${notification.message.replace(/\n/g, '<br>')}</p>
          </div>
          <div class="footer">
            <p>このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async scheduleNotification(notification: Notification): Promise<void> {
    // In production, use a job queue like Bull or Agenda
    const delay = notification.scheduledFor.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        this.sendNotification(notification.id);
      }, delay);
    }
  }

  // Specific notification methods
  async sendCaseAssignmentNotification(
    caseEntity: Case,
    company: Company,
    salesAccount: SalesAccount
  ): Promise<void> {
    // Notify sales account
    await this.createNotification({
      type: NotificationType.CASE_ASSIGNED,
      channel: NotificationChannel.EMAIL,
      recipient: salesAccount.email,
      recipientName: salesAccount.contactPerson,
      subject: `新規案件割当: ${caseEntity.caseNumber}`,
      message: `
        新規案件が割り当てられました。
        
        案件番号: ${caseEntity.caseNumber}
        お客様名: ${caseEntity.customerName}
        住所: ${caseEntity.address.prefecture}${caseEntity.address.city}
        物件種別: ${caseEntity.propertyType}
        緊急度: ${caseEntity.urgency}
        
        詳細は管理画面でご確認ください。
      `,
      caseId: caseEntity.id,
      metadata: {
        companyId: company.id,
        salesAccountId: salesAccount.id,
        priority: caseEntity.urgency === 'urgent' ? 'high' : 'normal',
      },
    });

    // Also send SMS if urgent
    if (caseEntity.urgency === 'urgent' && salesAccount.phoneNumber) {
      await this.createNotification({
        type: NotificationType.CASE_ASSIGNED,
        channel: NotificationChannel.SMS,
        recipient: salesAccount.phoneNumber,
        message: `緊急案件割当: ${caseEntity.caseNumber} - ${caseEntity.customerName}様。至急対応をお願いします。`,
        caseId: caseEntity.id,
      });
    }
  }

  async sendCaseStatusNotification(
    caseEntity: Case,
    newStatus: string
  ): Promise<void> {
    // Notify customer if email exists
    if (caseEntity.email) {
      const statusMessages = {
        hearing_scheduled: 'ヒアリング日程が確定しました',
        estimate_submitted: '見積書をお送りしました',
        contracted: 'ご契約ありがとうございます',
      };

      const message = statusMessages[newStatus];
      if (message) {
        await this.createNotification({
          type: NotificationType.CASE_STATUS_CHANGED,
          channel: NotificationChannel.EMAIL,
          recipient: caseEntity.email,
          recipientName: caseEntity.customerName,
          subject: `【外壁塗装くらべるAI】${message}`,
          message: `
            ${caseEntity.customerName} 様
            
            ${message}
            
            案件番号: ${caseEntity.caseNumber}
            
            ご不明な点がございましたら、担当者までお問い合わせください。
          `,
          caseId: caseEntity.id,
        });
      }
    }
  }

  async sendHearingScheduledNotification(
    caseEntity: Case,
    scheduledAt: Date
  ): Promise<void> {
    // Send reminder 1 day before
    const reminderDate = new Date(scheduledAt);
    reminderDate.setDate(reminderDate.getDate() - 1);

    if (caseEntity.email) {
      await this.createNotification({
        type: NotificationType.HEARING_REMINDER,
        channel: NotificationChannel.EMAIL,
        recipient: caseEntity.email,
        recipientName: caseEntity.customerName,
        subject: '【リマインダー】明日ヒアリング予定',
        message: `
          ${caseEntity.customerName} 様
          
          明日 ${scheduledAt.toLocaleString('ja-JP')} にヒアリングを予定しております。
          
          ご準備のほど、よろしくお願いいたします。
        `,
        caseId: caseEntity.id,
        scheduledFor: reminderDate,
      });
    }
  }

  async sendPaymentReminderNotification(
    invoice: any,
    company: Company
  ): Promise<void> {
    await this.createNotification({
      type: NotificationType.PAYMENT_REMINDER,
      channel: NotificationChannel.EMAIL,
      recipient: company.billingInfo.email,
      recipientName: company.representativeName,
      subject: `【お支払いリマインダー】請求書 ${invoice.invoiceNumber}`,
      message: `
        ${company.name} 様
        
        下記請求書のお支払い期限が近づいております。
        
        請求書番号: ${invoice.invoiceNumber}
        請求金額: ¥${invoice.total.toLocaleString()}
        支払期限: ${invoice.dueDate.toLocaleDateString('ja-JP')}
        
        お支払いがお済みの場合は、お手数ですが弊社までご連絡ください。
      `,
      metadata: {
        companyId: company.id,
        invoiceId: invoice.id,
      },
    });
  }

  async getNotificationHistory(
    filter: {
      caseId?: string;
      recipient?: string;
      type?: NotificationType;
      status?: NotificationStatus;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<Notification[]> {
    const query = this.notificationRepository.createQueryBuilder('notification');

    if (filter.caseId) {
      query.andWhere('notification.caseId = :caseId', { caseId: filter.caseId });
    }

    if (filter.recipient) {
      query.andWhere('notification.recipient = :recipient', { recipient: filter.recipient });
    }

    if (filter.type) {
      query.andWhere('notification.type = :type', { type: filter.type });
    }

    if (filter.status) {
      query.andWhere('notification.status = :status', { status: filter.status });
    }

    if (filter.dateFrom && filter.dateTo) {
      query.andWhere('notification.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
      });
    }

    return query.orderBy('notification.createdAt', 'DESC').getMany();
  }

  async resendNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Reset status to pending
    notification.status = NotificationStatus.PENDING;
    notification.metadata = {
      ...notification.metadata,
      retryCount: 0,
    };

    await this.notificationRepository.save(notification);
    await this.sendNotification(notificationId);
  }
}