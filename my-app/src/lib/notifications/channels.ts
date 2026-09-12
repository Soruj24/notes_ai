/**
 * Delivery channels. New transports (email, push, SMS…) implement
 * NotificationChannel and register in defaultChannels() — the reminder
 * domain never changes when a channel is added.
 */

export interface NotificationPayload {
  userId: string;
  workspaceId: string;
  title: string;
  body?: string;
  href?: string;
  reminderId?: string;
}

export interface DeliveryResult {
  channel: string;
  delivered: boolean;
  detail?: string;
}

export interface NotificationChannel {
  readonly name: string;
  /** False when the transport isn't configured — skipped silently. */
  isEnabled(): boolean;
  send(payload: NotificationPayload): Promise<DeliveryResult>;
}

/** Always-on inbox row (the notification center reads these). */
export class InAppChannel implements NotificationChannel {
  readonly name = "in_app";

  isEnabled(): boolean {
    return true;
  }

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const { createNotification } = await import(
      "@/src/repositories/notification.repository"
    );
    const { publishDomainEvent } = await import("@/src/lib/realtime/domain");
    const record = await createNotification({
      workspaceId: payload.workspaceId,
      userId: payload.userId,
      type: "reminder",
      title: payload.title,
      body: payload.body,
      linkHref: payload.href,
    });
    publishDomainEvent("notification.created", {
      workspaceId: payload.workspaceId,
      actorId: payload.userId,
      entityId: record.id,
    });
    return { channel: this.name, delivered: true };
  }
}

export interface EmailConfig {
  enabled: boolean;
  provider: string;
  fromName: string;
  fromAddress: string;
  configured: boolean;
}

/** Admin-managed email config (preparatory until an SMTP transport lands). */
export async function getEmailConfig(): Promise<EmailConfig> {
  const { getSettingValue } = await import("@/src/lib/settings/state");
  const [enabled, provider, fromName, fromAddress] = await Promise.all([
    getSettingValue("email.enabled", false),
    getSettingValue("email.provider", "none"),
    getSettingValue("email.fromName", "NotoAI"),
    getSettingValue("email.fromAddress", ""),
  ]);
  return {
    enabled,
    provider,
    fromName,
    fromAddress,
    configured: enabled && provider !== "none" && fromAddress.length > 0,
  };
}

/** Email transport. Activates when the admin email settings are complete. */
export class EmailChannel implements NotificationChannel {
  readonly name = "email";

  isEnabled(): boolean {
    return true;
  }

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const config = await getEmailConfig();
    if (!config.configured) {
      return {
        channel: this.name,
        delivered: false,
        detail: "Email delivery is not configured.",
      };
    }
    // TODO: plug in nodemailer/ses with stored SMTP credentials.
    return {
      channel: this.name,
      delivered: false,
      detail: `Email stub: would send "${payload.title}" to user ${payload.userId} via ${config.provider}.`,
    };
  }
}

/** Push transport. Activates when a push provider is configured. */
export class PushChannel implements NotificationChannel {
  readonly name = "push";

  isEnabled(): boolean {
    return Boolean(process.env.PUSH_PROVIDER_KEY);
  }

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    // TODO: plug in web-push/FCM with PUSH_PROVIDER_KEY.
    return {
      channel: this.name,
      delivered: false,
      detail: `Push stub: would notify user ${payload.userId}.`,
    };
  }
}

export function defaultChannels(): NotificationChannel[] {
  return [new InAppChannel(), new EmailChannel(), new PushChannel()];
}

/** Fan out across enabled channels; one failure never blocks the others. */
export async function sendToChannels(
  payload: NotificationPayload,
  channels: NotificationChannel[] = defaultChannels(),
): Promise<DeliveryResult[]> {
  const { getSettingValue } = await import("@/src/lib/settings/state");
  if (!(await getSettingValue("notifications.enabled", true))) return [];
  const results: DeliveryResult[] = [];
  for (const channel of channels) {
    if (!channel.isEnabled()) continue;
    try {
      results.push(await channel.send(payload));
    } catch (err) {
      results.push({
        channel: channel.name,
        delivered: false,
        detail: err instanceof Error ? err.message : "Send failed.",
      });
    }
  }
  return results;
}
