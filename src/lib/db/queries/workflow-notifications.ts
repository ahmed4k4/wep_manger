import 'server-only';

import type { NotificationType } from '@/types/project';
import { createNotificationsForUsers } from './notifications';

export async function notifyUsers(input: {
  userIds: string[];
  actorId?: string | null;
  projectId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  metadata?: Record<string, unknown>;
}) {
  const userIds = [...new Set(input.userIds)].filter((id) => !!id && id !== input.actorId);
  if (!userIds.length) return;
  await createNotificationsForUsers({
    user_ids: userIds,
    project_id: input.projectId,
    type: input.type,
    title: input.title,
    message: input.message,
    action_url: input.actionUrl,
    action_label: input.actionLabel,
    metadata: input.metadata || {},
  });
}
