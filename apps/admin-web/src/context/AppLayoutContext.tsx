// admin-web/src/context/AppLayoutContext.tsx
import {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
  type ReactNode,
} from 'react';

interface AppLayoutHeader {
  title: string;
  breadcrumb?: { label: string; highlight?: string };
  actions?: ReactNode;
}

const DEFAULT_HEADER: AppLayoutHeader = { title: '' };

// ⚠️ CỐ Ý tách thành 2 context riêng biệt, KHÔNG gộp {header, setHeader}
// vào 1 object như bản trước — đó chính là nguyên nhân gây infinite loop
// thật đã xảy ra ("Maximum update depth exceeded"):
//
//   - HeaderValueContext: giá trị header HIỆN TẠI — chỉ TopNavConnected đọc.
//   - SetHeaderContext: CHÍNH hàm setState (setHeader) — React đảm bảo
//     identity của setState setter KHÔNG BAO GIỜ đổi giữa các lần re-render
//     (dù component chứa nó re-render bao nhiêu lần).
//
// useAppLayoutHeader() (mọi page đều gọi) CHỈ cần setHeader để gọi, không
// cần đọc header hiện tại — nên nó chỉ subscribe SetHeaderContext. Vì giá
// trị context đó (setHeader) không bao giờ đổi reference, page sẽ KHÔNG
// bao giờ bị ép re-render chỉ vì header thay đổi ở nơi khác — phá vỡ hoàn
// toàn vòng lặp: setHeader() giờ chỉ khiến TopNavConnected (nơi DUY NHẤT
// đọc HeaderValueContext) re-render, page gọi hook thì đứng yên.
const HeaderValueContext = createContext<AppLayoutHeader>(DEFAULT_HEADER);
const SetHeaderContext = createContext<((header: AppLayoutHeader) => void) | null>(null);

export function AppLayoutProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<AppLayoutHeader>(DEFAULT_HEADER);
  return (
    <SetHeaderContext.Provider value={setHeader}>
      <HeaderValueContext.Provider value={header}>
        {children}
      </HeaderValueContext.Provider>
    </SetHeaderContext.Provider>
  );
}

/**
 * Mỗi page gọi hook này ở đầu component để khai báo title/breadcrumb/actions
 * cho TopNav. Chạy lại mỗi render (không có dependency array) — cần thiết
 * vì `actions` thường chứa JSX có state sống (VD SearchInput controlled) —
 * nhưng KHÔNG gây infinite loop vì page chỉ subscribe SetHeaderContext
 * (identity ổn định), không subscribe HeaderValueContext.
 */
export function useAppLayoutHeader(header: AppLayoutHeader) {
  const setHeader = useContext(SetHeaderContext);
  if (!setHeader) {
    throw new Error('useAppLayoutHeader must be used within AppLayoutProvider (AppShell)');
  }
  useLayoutEffect(() => {
    setHeader(header);
  });
}

/** Chỉ dùng trong TopNavConnected (AppShell.tsx) — KHÔNG dùng ở page. */
export function useAppLayoutHeaderState() {
  return useContext(HeaderValueContext);
}