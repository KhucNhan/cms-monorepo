admin-web
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── src
│   ├── App.tsx
│   ├── api
│   │   ├── auth.api.ts
│   │   ├── blocks.api.ts
│   │   ├── client.ts
│   │   ├── content.api.ts
│   │   ├── media.api.ts
│   │   ├── page-versions.api.ts
│   │   ├── pages.api.ts
│   │   └── users.api.ts
│   ├── components
│   │   ├── ProtectedRoute.tsx
│   │   ├── layout
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopNav.tsx
│   │   └── ui
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Toast.tsx
│   ├── config
│   │   └── cn.ts
│   ├── context
│   │   └── AuthContext.tsx
│   ├── hooks
│   │   ├── useAuth.ts
│   │   ├── useContentEntries.ts
│   │   ├── useMedia.ts
│   │   ├── usePages.ts
│   │   └── useUsers.ts
│   ├── index.css
│   ├── main.tsx
│   ├── pages
│   │   ├── auth
│   │   │   └── LoginPage.tsx
│   │   ├── content-manager
│   │   │   ├── BlockPickerModal.tsx
│   │   │   ├── ContentManagerPage.tsx
│   │   │   ├── PageEditPage.tsx
│   │   │   └── components
│   │   │       ├── BlockDataForm.tsx
│   │   │       ├── BlockSectionCard.tsx
│   │   │       ├── CreatePageModal.tsx
│   │   │       ├── UnsavedChangesModal.tsx
│   │   │       └── block-editors
│   │   │           ├── FaqBlockEditor.tsx
│   │   │           ├── HeroBlockEditor.tsx
│   │   │           ├── JsonBlockEditor.tsx
│   │   │           ├── RichTextBlockEditor.tsx
│   │   │           └── rich-text.utils.ts
│   │   ├── content-type-builder
│   │   │   └── ContentTypeBuilderPage.tsx
│   │   ├── dashboard
│   │   │   └── DashboardPage.tsx
│   │   ├── media-library
│   │   │   ├── MediaLibraryPage.tsx
│   │   │   └── components
│   │   │       └── MediaPickerModal.tsx
│   │   └── settings
│   │       ├── SettingsPage.tsx
│   │       └── components
│   │           └── UserFormModal.tsx
│   └── types
│       └── index.ts
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── vite.config.ts