/**
 * Project Management Type Definitions
 * Matches the database schema from docs/database/DESIGN.md
 */

// ============================================================================
// Enums
// ============================================================================

export type UserRole = 'ADMIN' | 'USER';

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'ON_HOLD';

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'COMPLETED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type NotificationType =
  | 'MENTION'
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMMENT'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'PROJECT_INVITE'
  | 'PROJECT_UPDATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_ROLE_CHANGED'
  | 'FILE_UPLOADED'
  | 'NOTE_CREATED'
  | 'NOTE_COMMENT'
  | 'NOTE_MENTION'
  | 'SYSTEM_ALERT';

export type ActivityAction =
  | 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'PROJECT_ARCHIVED' | 'PROJECT_DELETED'
  | 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED'
  | 'TASK_PRIORITY_CHANGED' | 'TASK_DELETED'
  | 'MEMBER_INVITED' | 'MEMBER_JOINED' | 'MEMBER_ROLE_CHANGED' | 'MEMBER_REMOVED'
  | 'FILE_UPLOADED' | 'FILE_DOWNLOADED' | 'FILE_DELETED'
  | 'NOTE_CREATED' | 'NOTE_UPDATED' | 'NOTE_DELETED' | 'NOTE_PRIVACY_CHANGED'
  | 'COMMENT_CREATED' | 'COMMENT_UPDATED' | 'COMMENT_DELETED'
  | 'USER_PROFILE_UPDATED' | 'USER_AVATAR_CHANGED'
  | 'USER_LOGIN' | 'USER_LOGOUT' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET';

export type EntityType = 'project' | 'task' | 'member' | 'file' | 'note' | 'comment' | 'user';

// ============================================================================
// Core Entity Types
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  locale: string;
  theme: 'light' | 'dark' | 'system';
  notification_preferences: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: ProjectStatus;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  // Joined fields
  profile?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number; // 0-100
  assignee_id: string | null;
  created_by: string;
  reporter_id: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  assignee?: Profile;
  creator?: Profile;
  reporter?: Profile;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  user?: Profile;
  replies?: TaskComment[];
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_id: string;
  uploaded_by: string;
  created_at: string;
  // Joined fields
  file?: ProjectFile;
  uploader?: Profile;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  uploaded_by: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  checksum: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  uploader?: Profile;
}

export interface UserFile {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  checksum: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  author?: Profile;
}

export interface UserNote {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action: ActivityAction;
  entity_type: EntityType;
  entity_id: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined fields
  user?: Profile;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ============================================================================
// Form/Input Types
// ============================================================================

export interface CreateProjectInput {
  name: string;
  key: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  reporter_id?: string;
  start_date?: string;
  due_date?: string;
  position?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  assignee_id?: string | null;
  reporter_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  position?: number;
}

export interface CreateProjectMemberInput {
  project_id: string;
  user_id: string;
  role?: ProjectRole;
  invited_by?: string;
}

export interface UpdateProjectMemberInput {
  role: ProjectRole;
}

export interface CreateTaskCommentInput {
  task_id: string;
  content: string;
  parent_id?: string;
}

export interface UpdateTaskCommentInput {
  content: string;
}

export interface CreateProjectFileInput {
  project_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  checksum?: string;
  description?: string;
}

export interface CreateUserFileInput {
  user_id: string;
  project_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  checksum?: string;
  description?: string;
}

export interface CreateProjectNoteInput {
  project_id: string;
  title: string;
  content: string;
  is_pinned?: boolean;
}

export interface UpdateProjectNoteInput {
  title?: string;
  content?: string;
  is_pinned?: boolean;
}

export interface CreateUserNoteInput {
  user_id: string;
  project_id: string;
  title: string;
  content: string;
  is_pinned?: boolean;
}

export interface UpdateUserNoteInput {
  title?: string;
  content?: string;
  is_pinned?: boolean;
}

// ============================================================================
// Filter/Query Types
// ============================================================================

export interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name';
  sort_order?: 'asc' | 'desc';
}

export interface TaskFilters {
  project_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'position';
  sort_order?: 'asc' | 'desc';
}

export interface CreateCommentInput {
  task_id: string;
  content: string;
  parent_id?: string | null;
}

export interface UpdateCommentInput {
  content: string;
}

export interface MemberFilters {
  project_id: string;
  role?: ProjectRole;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface FileFilters {
  project_id?: string;
  user_id?: string;
  mime_type?: string;
  page?: number;
  page_size?: number;
}

export interface NoteFilters {
  project_id?: string;
  user_id?: string;
  is_pinned?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface NotificationFilters {
  user_id: string;
  project_id?: string;
  read?: boolean;
  type?: NotificationType;
  page?: number;
  page_size?: number;
}

export interface ActivityLogFilters {
  project_id?: string;
  user_id?: string;
  entity_type?: EntityType;
  entity_id?: string;
  action?: ActivityAction;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface ProjectCardProps {
  project: Project & {
    member_count?: number;
    task_stats?: {
      total: number;
      completed: number;
      in_progress: number;
    };
  };
  onClick?: () => void;
}

export interface TaskCardProps {
  task: Task & {
    assignee?: Profile;
  };
  onClick?: () => void;
  draggable?: boolean;
}

export interface MemberCardProps {
  member: ProjectMember & { profile: Profile };
  currentUserRole: ProjectRole;
  onRoleChange?: (memberId: string, newRole: ProjectRole) => void;
  onRemove?: (memberId: string) => void;
}

export interface ProjectStats {
  total_tasks: number;
  todo_count: number;
  in_progress_count: number;
  review_count: number;
  blocked_count: number;
  completed_count: number;
  urgent_count: number;
  high_count: number;
  avg_progress: number;
  overdue_count: number;
  member_count: number;
}

export interface UserWorkload {
  user_id: string;
  assigned_count: number;
  todo_count: number;
  in_progress_count: number;
  review_count: number;
  blocked_count: number;
  overdue_count: number;
  urgent_count: number;
}

// ============================================================================
// Supabase Types
// ============================================================================

export interface SupabaseClient {
  from: (table: string) => SupabaseQueryBuilder;
  rpc: (functionName: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
    getSession: () => Promise<{ data: { session: { user: { id: string } } | null }; error: Error | null }>;
  };
  storage: {
    from: (bucket: string) => SupabaseStorageBucket;
  };
}

export interface PostgrestError {
  message: string;
  code: string;
  details?: string;
  hint?: string;
}

export interface SupabaseQueryBuilder {
  select: (columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated' }) => SupabaseQueryBuilder;
  insert: (values: Record<string, unknown> | Record<string, unknown>[], options?: { returning?: 'minimal' | 'representation' }) => SupabaseQueryBuilder;
  update: (values: Record<string, unknown>, options?: { returning?: 'minimal' | 'representation' }) => SupabaseQueryBuilder;
  delete: (options?: { returning?: 'minimal' | 'representation' }) => SupabaseQueryBuilder;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder;
  neq: (column: string, value: unknown) => SupabaseQueryBuilder;
  gt: (column: string, value: unknown) => SupabaseQueryBuilder;
  gte: (column: string, value: unknown) => SupabaseQueryBuilder;
  lt: (column: string, value: unknown) => SupabaseQueryBuilder;
  lte: (column: string, value: unknown) => SupabaseQueryBuilder;
  like: (column: string, pattern: string) => SupabaseQueryBuilder;
  ilike: (column: string, pattern: string) => SupabaseQueryBuilder;
  in: (column: string, values: unknown[]) => SupabaseQueryBuilder;
  contains: (column: string, value: unknown) => SupabaseQueryBuilder;
  is: (column: string, value: 'null' | 'true' | 'false') => SupabaseQueryBuilder;
  or: (filters: string) => SupabaseQueryBuilder;
  filter: (column: string, operator: string, value: unknown) => SupabaseQueryBuilder;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => SupabaseQueryBuilder;
  limit: (count: number) => SupabaseQueryBuilder;
  range: (from: number, to: number) => SupabaseQueryBuilder;
  single: () => Promise<{ data: unknown; error: PostgrestError | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: PostgrestError | null }>;
  then: <T>(onfulfilled?: (value: { data: T; error: PostgrestError | null }) => T | PromiseLike<T>) => Promise<T>;
}

export interface SupabaseStorageBucket {
  upload: (path: string, file: File | Blob | ArrayBuffer, options?: { cacheControl?: string; contentType?: string; upsert?: boolean }) => Promise<{ data: { path: string; id: string; fullPath: string } | null; error: Error | null }>;
  download: (path: string) => Promise<{ data: Blob | null; error: Error | null }>;
  remove: (paths: string[]) => Promise<{ data: unknown[] | null; error: Error | null }>;
  list: (path?: string, options?: { limit?: number; offset?: number; sortBy?: { column: string; order: 'asc' | 'desc' } }) => Promise<{ data: { name: string; id: string; updated_at: string; created_at: string; last_accessed_at: string; metadata: Record<string, unknown> }[] | null; error: Error | null }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
  createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null; error: Error | null }>;
  createSignedUploadUrl: (path: string) => Promise<{ data: { signedUrl: string; token: string } | null; error: Error | null }>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at: string;
};

export type WithSoftDelete<T> = T & {
  deleted_at: string | null;
};

export type ProjectWithRelations = Project & {
  owner: Profile;
  members: (ProjectMember & { profile: Profile })[];
  task_stats?: ProjectStats;
};

export type TaskWithRelations = Task & {
  assignee: Profile | null;
  creator: Profile;
  reporter: Profile | null;
  comments: TaskComment[];
  attachments: (TaskAttachment & { file: ProjectFile })[];
};

export type ProjectMemberWithProfile = ProjectMember & { profile: Profile };