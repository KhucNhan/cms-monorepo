admin-api
├── dist
│   ├── app.module.d.ts
│   ├── app.module.js
│   ├── app.module.js.map
│   ├── check-db.d.ts
│   ├── check-db.js
│   ├── check-db.js.map
│   ├── common
│   │   ├── filters
│   │   │   ├── http-exception.filter.d.ts
│   │   │   ├── http-exception.filter.js
│   │   │   └── http-exception.filter.js.map
│   │   ├── interceptors
│   │   │   ├── response.interceptor.d.ts
│   │   │   ├── response.interceptor.js
│   │   │   └── response.interceptor.js.map
│   │   └── pipes
│   │       ├── zod-validation.pipe.d.ts
│   │       ├── zod-validation.pipe.js
│   │       └── zod-validation.pipe.js.map
│   ├── main.d.ts
│   ├── main.js
│   ├── main.js.map
│   ├── modules
│   │   ├── auth
│   │   │   ├── auth.controller.d.ts
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.controller.js.map
│   │   │   ├── auth.module.d.ts
│   │   │   ├── auth.module.js
│   │   │   ├── auth.module.js.map
│   │   │   ├── auth.service.d.ts
│   │   │   ├── auth.service.js
│   │   │   ├── auth.service.js.map
│   │   │   ├── dto
│   │   │   │   ├── auth.dto.d.ts
│   │   │   │   ├── auth.dto.js
│   │   │   │   └── auth.dto.js.map
│   │   │   ├── guards
│   │   │   │   ├── jwt-auth.guard.d.ts
│   │   │   │   ├── jwt-auth.guard.js
│   │   │   │   ├── jwt-auth.guard.js.map
│   │   │   │   ├── roles.guard.d.ts
│   │   │   │   ├── roles.guard.js
│   │   │   │   └── roles.guard.js.map
│   │   │   └── strategies
│   │   │       ├── jwt.strategy.d.ts
│   │   │       ├── jwt.strategy.js
│   │   │       └── jwt.strategy.js.map
│   │   ├── blocks
│   │   │   ├── blocks.controller.d.ts
│   │   │   ├── blocks.controller.js
│   │   │   ├── blocks.controller.js.map
│   │   │   ├── blocks.module.d.ts
│   │   │   ├── blocks.module.js
│   │   │   ├── blocks.module.js.map
│   │   │   ├── blocks.service.d.ts
│   │   │   ├── blocks.service.js
│   │   │   └── blocks.service.js.map
│   │   ├── pages
│   │   │   ├── page-versions.controller.d.ts
│   │   │   ├── page-versions.controller.js
│   │   │   ├── page-versions.controller.js.map
│   │   │   ├── page-versions.service.d.ts
│   │   │   ├── page-versions.service.js
│   │   │   ├── page-versions.service.js.map
│   │   │   ├── pages.controller.d.ts
│   │   │   ├── pages.controller.js
│   │   │   ├── pages.controller.js.map
│   │   │   ├── pages.module.d.ts
│   │   │   ├── pages.module.js
│   │   │   ├── pages.module.js.map
│   │   │   ├── pages.service.d.ts
│   │   │   ├── pages.service.js
│   │   │   ├── pages.service.js.map
│   │   │   ├── public-pages.controller.d.ts
│   │   │   ├── public-pages.controller.js
│   │   │   └── public-pages.controller.js.map
│   │   └── users
│   │       ├── users.controller.d.ts
│   │       ├── users.controller.js
│   │       ├── users.controller.js.map
│   │       ├── users.module.d.ts
│   │       ├── users.module.js
│   │       ├── users.module.js.map
│   │       ├── users.service.d.ts
│   │       ├── users.service.js
│   │       └── users.service.js.map
│   ├── prisma
│   │   ├── prisma.module.d.ts
│   │   ├── prisma.module.js
│   │   ├── prisma.module.js.map
│   │   ├── prisma.service.d.ts
│   │   ├── prisma.service.js
│   │   └── prisma.service.js.map
│   └── tsconfig.tsbuildinfo
├── nest-cli.json
├── package.json
├── prisma
│   ├── migrations
│   │   ├── 20260625045130_init
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── schema.prisma
│   ├── seed.d.ts
│   ├── seed.js
│   ├── seed.js.map
│   └── seed.ts
├── src
│   ├── app.module.ts
│   ├── check-db.ts
│   ├── common
│   │   ├── filters
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors
│   │   │   └── response.interceptor.ts
│   │   └── pipes
│   │       └── zod-validation.pipe.ts
│   ├── main.ts
│   ├── modules
│   │   ├── auth
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto
│   │   │   │   └── auth.dto.ts
│   │   │   ├── guards
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   └── strategies
│   │   │       └── jwt.strategy.ts
│   │   ├── blocks
│   │   │   ├── blocks.controller.ts
│   │   │   ├── blocks.module.ts
│   │   │   └── blocks.service.ts
│   │   ├── pages
│   │   │   ├── page-versions.controller.ts
│   │   │   ├── page-versions.service.ts
│   │   │   ├── pages.controller.ts
│   │   │   ├── pages.module.ts
│   │   │   ├── pages.service.ts
│   │   │   └── public-pages.controller.ts
│   │   └── users
│   │       ├── users.controller.ts
│   │       ├── users.module.ts
│   │       └── users.service.ts
│   └── prisma
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── tsconfig.json
└── tsconfig.tsbuildinfo