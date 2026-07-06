// ─────────────────────────────────────────────────────────
// API Response Envelope
// ─────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// ─────────────────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────────────────

export enum ErrorCode {
  VALIDATION_ERROR    = 'VALIDATION_ERROR',
  UNAUTHORIZED        = 'UNAUTHORIZED',
  FORBIDDEN           = 'FORBIDDEN',
  NOT_FOUND           = 'NOT_FOUND',
  CONFLICT            = 'CONFLICT',
  UNKNOWN_BLOCK_TYPE  = 'UNKNOWN_BLOCK_TYPE',
  INTERNAL_ERROR      = 'INTERNAL_ERROR',
  MEDIA_IN_USE        = 'MEDIA_IN_USE',
}

// ─────────────────────────────────────────────────────────
// RBAC — normalized Permission (resource + action)
// ─────────────────────────────────────────────────────────

/** Các resource hợp lệ trong hệ thống */
export type PermissionResource = 'page' | 'media' | 'user' | 'role';

/** Các action hợp lệ */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'publish';

/**
 * Permission dạng "resource:action" string — được embed vào JWT payload
 * để guard kiểm tra mà không cần query DB mỗi request.
 *
 * Ví dụ: "page:publish", "media:delete", "user:create"
 */
export type Permission = `${PermissionResource}:${PermissionAction}`;

export interface PermissionRecord {
  id: string;
  resource: PermissionResource;
  action: PermissionAction;
}

export interface Role {
  id: string;
  name: string;
  permissions: PermissionRecord[];
}

// ─────────────────────────────────────────────────────────
// Domain Types
// ─────────────────────────────────────────────────────────

export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Page {
  id: string;
  slug: string;
  publishedVersionId: string | null;
  createdAt: string;
}

export interface PageVersion {
  id: string;
  pageId: string;
  status: VersionStatus;
  seoMeta: SeoMeta;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeoMeta {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface Block {
  id: string;
  pageVersionId: string;
  type: string;
  orderIndex: number;
  data: Record<string, unknown>;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  roleId: string;
  role: Role;
}

export interface Media {
  id: string;
  url: string;
  key: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  // ── Mới: variant đã tối ưu (webp, ≤300KB) — null nếu record cũ chưa có hoặc là SVG ──
  detailKey: string | null;
  detailUrl: string | null;
  thumbKey: string | null;
  thumbUrl: string | null;
}

// ─────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
}

export interface JwtPayload {
  sub: string;           // userId
  email: string;
  roleId: string;
  /**
   * Permissions dạng "resource:action" — embed sẵn để guard không cần query DB.
   * Được tạo lúc login từ join Role → Role_Permissions → Permissions.
   */
  permissions: Permission[];
}

// ─────────────────────────────────────────────────────────
// Page with full content (used by Next.js render)
// ─────────────────────────────────────────────────────────

export interface PageWithContent extends Page {
  activeVersion: PageVersion & { blocks: Block[] };
}