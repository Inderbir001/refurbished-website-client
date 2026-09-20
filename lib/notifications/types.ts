import { Notification, NotificationChannel } from "@prisma/client";
export interface NotificationProvider { channel: NotificationChannel; send(notification: Notification): Promise<{ providerId: string }>; }
