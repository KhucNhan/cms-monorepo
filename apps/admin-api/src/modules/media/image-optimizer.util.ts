import sharp from 'sharp';

/**
 * Utility tối ưu ảnh cho module Media.
 * Dùng `sharp` (free, native binding libvips) — không cần license, không gọi API ngoài.
 *
 * Nguyên tắc chung:
 * - `sharp` mặc định KHÔNG giữ metadata (EXIF/GPS/camera info) trừ khi gọi `.withMetadata()`.
 *   Vì vậy CHỈ CẦN KHÔNG gọi `.withMetadata()` là đã tự động strip toàn bộ — không cần code riêng.
 * - `.rotate()` không tham số: tự động xoay ảnh theo EXIF Orientation trước khi encode, rồi bỏ luôn
 *   field Orientation (tránh ảnh bị "xoay ngược" khi xem trên trình duyệt không đọc EXIF).
 * - Convert toàn bộ ảnh raster (jpg/png/gif) sang WebP: cùng chất lượng nhìn nhưng nhẹ hơn JPEG
 *   25-35%, là đòn bẩy chính để đạt mục tiêu <300KB mà ít phải hy sinh quality.
 * - SVG là vector, KHÔNG đi qua pipeline này (xử lý riêng, giữ nguyên file gốc).
 */

export interface OptimizeVariantOptions {
  /** Cạnh dài tối đa (px). Ảnh nhỏ hơn sẽ không bị phóng to. */
  maxDimension?: number;
  /** Dung lượng tối đa mong muốn (bytes). Nếu set, sẽ lặp giảm quality/dimension tới khi đạt. */
  targetBytes?: number;
  /** Quality khởi điểm (0-100), giảm dần nếu vẫn vượt targetBytes. */
  initialQuality?: number;
  /** Quality sàn — không giảm dưới mức này (tránh ảnh vỡ hạt quá mức). */
  minQuality?: number;
  /** Góc xoay thủ công, cộng thêm vào auto-orient theo EXIF. 90 | -90 | 180. */
  rotateDeg?: 90 | -90 | 180;
  /** Crop theo vùng cụ thể (px, tính trên ảnh sau khi đã auto-orient). */
  crop?: { left: number; top: number; width: number; height: number };
}

export interface OptimizeResult {
  buffer: Buffer;
  format: 'webp';
  width: number;
  height: number;
  sizeBytes: number;
  /** Số vòng lặp đã giảm quality/dimension để đạt targetBytes (0 nếu đạt ngay lần đầu). */
  iterations: number;
}

const DEFAULT_QUALITY = 82;
const MIN_QUALITY_FLOOR = 40;
const QUALITY_STEP = 12;
const DIMENSION_SHRINK_FACTOR = 0.85;
const MAX_ITERATIONS = 8;

/**
 * Xử lý 1 buffer ảnh raster theo các option strip/resize/crop/rotate/format,
 * và nếu có `targetBytes`, lặp giảm quality rồi giảm dimension tới khi đạt
 * (hoặc tới MAX_ITERATIONS để tránh vòng lặp vô hạn / quality quá thấp).
 *
 * Không có targetBytes -> chỉ 1 pass duy nhất ở initialQuality (dùng cho variant
 * "original": strip metadata + auto-orient + convert WebP, KHÔNG ép về size cụ thể).
 */
export async function optimizeImage(
  input: Buffer,
  opts: OptimizeVariantOptions = {},
): Promise<OptimizeResult> {
  const {
    maxDimension,
    targetBytes,
    initialQuality = DEFAULT_QUALITY,
    minQuality = MIN_QUALITY_FLOOR,
    rotateDeg,
    crop,
  } = opts;

  let quality = initialQuality;
  let dimension = maxDimension;
  let iterations = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let pipeline = sharp(input).rotate(); // auto-orient theo EXIF + strip metadata (mặc định)

    if (rotateDeg) pipeline = pipeline.rotate(rotateDeg);
    if (crop) pipeline = pipeline.extract(crop);
    if (dimension) {
      pipeline = pipeline.resize({
        width: dimension,
        height: dimension,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const { data, info } = await pipeline
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });

    const sizeBytes = data.length;
    const doneByTarget = !targetBytes || sizeBytes <= targetBytes;

    if (doneByTarget || iterations >= MAX_ITERATIONS) {
      return { buffer: data, format: 'webp', width: info.width, height: info.height, sizeBytes, iterations };
    }

    iterations += 1;
    // Giảm quality trước (giữ kích thước, giảm chi tiết nén) — ưu tiên giữ resolution.
    if (quality - QUALITY_STEP >= minQuality) {
      quality -= QUALITY_STEP;
      continue;
    }
    // Quality đã chạm sàn -> giảm tiếp kích thước rồi thử lại ở quality vừa phải.
    const currentWidth = info.width;
    dimension = Math.round(currentWidth * DIMENSION_SHRINK_FACTOR);
    quality = Math.max(minQuality, DEFAULT_QUALITY - QUALITY_STEP); // reset quality vừa phải cho vòng resize mới
  }
}

/** Preset cho 3 variant lưu trong DB — xem quyết định ở phần trao đổi trước khi code. */
export const MEDIA_VARIANT_PRESETS = {
  /** Bản gốc: giữ độ phân giải cao (chỉ cap ở mức rất lớn), KHÔNG ép targetBytes. */
  original: { maxDimension: 2560, initialQuality: 90 } satisfies OptimizeVariantOptions,
  /** Bản dùng cho preview/edit lớn (Page Editor canvas...): ép ≤300KB. */
  detail: { maxDimension: 1600, targetBytes: 300 * 1024, initialQuality: 82 } satisfies OptimizeVariantOptions,
  /** Bản dùng cho grid Media Library: nhỏ, ép ≤300KB (thường đạt ngay quality cao vì đã nhỏ). */
  thumb: { maxDimension: 400, targetBytes: 300 * 1024, initialQuality: 80 } satisfies OptimizeVariantOptions,
} as const;

export function isRasterImage(mimeType: string): boolean {
  return mimeType !== 'image/svg+xml';
}

// ─────────────────────────────────────────────────────────
// Variant "original" — logic so sánh size gốc vs size sau optimize
// ─────────────────────────────────────────────────────────

/** Ngưỡng coi là "file đã nhỏ sẵn" — dưới ngưỡng này mới cần rollback nếu optimize làm to hơn. */
export const SMALL_FILE_THRESHOLD_BYTES = 300 * 1024; // 300KB

export interface OriginalVariantDecision {
  /** Buffer cuối cùng sẽ ghi xuống disk (gốc hoặc đã optimize, tuỳ quyết định). */
  buffer: Buffer;
  width: number | null;
  height: number | null;
  /** mimeType cuối cùng: 'image/webp' nếu dùng bản optimize, giữ nguyên mimeType gốc nếu rollback. */
  mimeType: string;
  /** extension cuối cùng: '.webp' nếu dùng bản optimize, giữ nguyên extension gốc nếu rollback. */
  extension: string;
  /** true = đã rollback dùng file gốc, KHÔNG dùng bản optimize. */
  usedOriginal: boolean;
  /** Thông tin để log/audit — không phục vụ logic, chỉ để caller ghi log. */
  meta: {
    originalSizeBytes: number;
    optimizedSizeBytes: number;
    wasSmallFile: boolean; // size gốc <= 300KB
    optimizeMadeItBigger: boolean; // optimizedSize > originalSize
  };
}

/**
 * Quyết định dùng bản gốc hay bản optimize (WebP) cho variant "original" lúc upload.
 *
 * Quy tắc (đã chốt với người dùng):
 * 1. Luôn chạy optimize (WebP, quality 90, cap 2560px, strip metadata) để có số liệu so sánh.
 * 2. Nếu size gốc <= 300KB VÀ bản optimize LỚN HƠN size gốc:
 *      → rollback hoàn toàn, giữ nguyên buffer + mimeType + extension gốc (ưu tiên dung lượng,
 *        chấp nhận không đồng nhất 100% định dạng WebP).
 * 3. Ngược lại (gốc > 300KB, hoặc optimize vẫn nhỏ hơn/bằng): dùng bản optimize WebP.
 *
 * Hàm thuần (không log, không side-effect I/O ngoài sharp) để dễ unit test — caller
 * (MediaService) chịu trách nhiệm log kết quả trả về.
 */
export async function decideOriginalVariant(
  inputBuffer: Buffer,
  originalMimeType: string,
  originalExtension: string,
): Promise<OriginalVariantDecision> {
  const originalSizeBytes = inputBuffer.length;

  const optimized = await optimizeImage(inputBuffer, MEDIA_VARIANT_PRESETS.original);
  const optimizedSizeBytes = optimized.sizeBytes;

  const wasSmallFile = originalSizeBytes <= SMALL_FILE_THRESHOLD_BYTES;
  const optimizeMadeItBigger = optimizedSizeBytes > originalSizeBytes;

  const meta = { originalSizeBytes, optimizedSizeBytes, wasSmallFile, optimizeMadeItBigger };

  if (wasSmallFile && optimizeMadeItBigger) {
    const originalMeta = await sharp(inputBuffer).metadata();
    return {
      buffer: inputBuffer,
      width: originalMeta.width ?? null,
      height: originalMeta.height ?? null,
      mimeType: originalMimeType,
      extension: originalExtension,
      usedOriginal: true,
      meta,
    };
  }

  return {
    buffer: optimized.buffer,
    width: optimized.width,
    height: optimized.height,
    mimeType: 'image/webp',
    extension: '.webp',
    usedOriginal: false,
    meta,
  };
}