// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Shape trả về từ BE /auth/login (sau khi unwrap envelope) */
export interface LoginResponse {
  accessToken: string;
}

/** Shape trả về từ BE /auth/me — là JwtPayload */
export interface AuthUser {
  sub: string;         // = user id
  email: string;
  roleId: string;
  permissions: string[];
}

/** Shape dùng để hiển thị user trên UI */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Pages (khớp với Prisma schema của BE) ───────────────────────────────────

export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Block {
  id: string;
  type: string;         // 'hero' | 'rich-text' | 'faq' — từ block-registry
  orderIndex: number;
  data: Record<string, unknown>;
  updatedAt: string;
  pageVersionId: string;
}

export interface HeroBlockData {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonHref?: string;
  alignment?: 'left' | 'center' | 'right';
  overlayOpacity?: number;
  image?: { mediaId?: string; alt?: string; url?: string };
}

export interface RichTextBlockData {
  content?: Record<string, unknown>;
  htmlFallback?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqBlockData {
  heading?: string;
  allowMultipleOpen?: boolean;
  items?: FaqItem[];
}

export interface PageVersion {
  id: string;
  status: VersionStatus;
  seoMeta: {
    title?: string;
    description?: string;
    ogImage?: string;
    noIndex?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  pageId: string;
  createdBy: string;
}

/** Shape từ GET /pages (list) — có publishedVersion + _count */
export interface Page {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  publishedVersionId: string | null;
  publishedVersion: {
    id: string;
    status: VersionStatus;
    updatedAt: string;
  } | null;
  _count: {
    versions: number;
  };
}

/** Shape từ GET /pages/:id (detail) — có full blocks */
export interface PageDetail extends Omit<Page, '_count'> {
  publishedVersion: (PageVersion & { blocks: Block[] }) | null;
  versions: Array<{
    id: string;
    status: VersionStatus;
    createdAt: string;
    createdBy: string;
  }>;
}

// ─── UI Filters ──────────────────────────────────────────────────────────────

export interface PageFilters {
  page?: number;
  pageSize?: number;
  search?: string;
}

// ─── Media ───────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  url: string;
  key: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  // ── Mới: variant đã tối ưu (webp, ≤300KB) — null nếu record cũ chưa có hoặc là SVG ──
  detailKey?: string | null;
  detailUrl?: string | null;
  thumbKey?: string | null;
  thumbUrl?: string | null;
}

export interface MediaFilters {
  page?: number;
  pageSize?: number;
  mimeType?: string;
  search?: string;
}

// ─── Legacy Content types (giữ để không break Badge, content.api, useContentEntries) ──

export type ContentStatus = 'published' | 'draft' | 'archived';

export interface ContentEntry {
  id: string;
  title: string;
  slug: string;
  author: string;
  category: string;
  status: ContentStatus;
  updatedAt: string;
  thumbnail?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContentFilters {
  status?: ContentStatus | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'newest' | 'oldest' | 'az' | 'za';
  search?: string;
}

// ─── Content Type Builder ─────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'email'
  | 'media'
  | 'relation';

/** New shape matching BE */
export interface ContentTypeField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  unique?: boolean;
}

/**
 * Legacy field shape used by ContentTypeBuilderPage (mock data).
 * @deprecated — will be replaced once ContentTypeBuilderPage connects to real API
 */
export interface ContentField {
  id: string;
  displayName: string;
  apiId: string;
  type: FieldType;
  required: boolean;
  private: boolean;
  description?: string;
}

export interface ContentType {
  id: string;
  name: string;
  /** Legacy — used by ContentTypeBuilderPage mock data */
  apiId?: string;
  /** Legacy — used by ContentTypeBuilderPage mock data */
  icon?: string;
  pluralName?: string;
  description?: string;
  /** Accepts both new and legacy field shapes */
  fields: (ContentTypeField | ContentField)[];
  entriesCount?: number;
  updatedAt?: string;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}