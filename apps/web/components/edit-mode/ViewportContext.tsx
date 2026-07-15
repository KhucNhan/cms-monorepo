'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ViewportPreset = 'mobile' | 'tablet' | 'desktop' | 'custom';

export const VIEWPORT_PRESET_WIDTHS: Record<Exclude<ViewportPreset, 'custom'>, number | null> = {
  mobile: 375,
  tablet: 768,
  desktop: null, // null = full width
};

interface ViewportContextValue {
  preset: ViewportPreset;
  /** px hiện tại khi preset = 'custom', hoặc khi preset = 'mobile'/'tablet' (đồng bộ theo bảng trên). */
  customWidth: number;
  /** null = full width (desktop), số = px đang áp dụng cho khung preview. */
  activeWidth: number | null;
  setPreset: (preset: ViewportPreset) => void;
  setCustomWidth: (width: number) => void;
}

const ViewportContext = createContext<ViewportContextValue | null>(null);

/**
 * ViewportProvider — bọc ở layout.tsx (bên trong AuthProvider, bao cả NavbarSwitcher/
 * AdminNavbar lẫn {children}/EditModeLayout) để 2 nhánh cây component không liên quan
 * trực tiếp vẫn chia sẻ được cùng 1 state viewport, không cần prop-drilling qua page.tsx.
 */
export function ViewportProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPresetState] = useState<ViewportPreset>('desktop');
  const [customWidth, setCustomWidth] = useState(1024);

  const setPreset = useCallback((next: ViewportPreset) => {
    setPresetState(next);
    // Khi chọn preset cố định (không phải 'custom'), đồng bộ luôn customWidth theo
    // bảng preset — để nếu người dùng kéo resize ngay sau đó, điểm bắt đầu đúng.
    if (next !== 'custom') {
      const w = VIEWPORT_PRESET_WIDTHS[next];
      if (w) setCustomWidth(w);
    }
  }, []);

  const activeWidth = preset === 'custom' ? customWidth : VIEWPORT_PRESET_WIDTHS[preset];

  const value = useMemo<ViewportContextValue>(
    () => ({ preset, customWidth, activeWidth, setPreset, setCustomWidth }),
    [preset, customWidth, activeWidth, setPreset],
  );

  return <ViewportContext.Provider value={value}>{children}</ViewportContext.Provider>;
}

export function useViewport(): ViewportContextValue {
  const ctx = useContext(ViewportContext);
  if (!ctx) {
    throw new Error('useViewport() must be used within <ViewportProvider>');
  }
  return ctx;
}