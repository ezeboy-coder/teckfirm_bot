export type NotificationPayload = {
  to: string;
  subject?: string;
  body: string;
};

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}

export class ConsoleNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    console.info(
      JSON.stringify({
        level: "INFO",
        message: "Notification queued",
        time: new Date().toISOString(),
        context: { to: payload.to, subject: payload.subject },
      }),
    );
  }
}

export const notificationService = new ConsoleNotificationProvider();
