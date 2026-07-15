import { PrismaClient, VersionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Định nghĩa tất cả permissions cần có ────────────────
const ALL_PERMISSIONS = [
  { resource: 'page',  action: 'create'  },
  { resource: 'page',  action: 'read'    },
  { resource: 'page',  action: 'update'  },
  { resource: 'page',  action: 'delete'  },
  { resource: 'page',  action: 'publish' },
  { resource: 'media', action: 'create'  },
  { resource: 'media', action: 'update'  },
  { resource: 'media', action: 'read'    },
  { resource: 'media', action: 'delete'  },
  { resource: 'user',  action: 'create'  },
  { resource: 'user',  action: 'read'    },
  { resource: 'user',  action: 'update'  },
  { resource: 'user',  action: 'delete'  },
  // ── mới: quản lý role & permission ──
  { resource: 'role',  action: 'create'  },
  { resource: 'role',  action: 'read'    },
  { resource: 'role',  action: 'update'  },
  { resource: 'role',  action: 'delete'  },
] as const;

// ── Mapping role → permissions ───────────────────────────
const ROLE_PERMISSIONS: Record<string, Array<{ resource: string; action: string }>> = {
  admin: ALL_PERMISSIONS as unknown as Array<{ resource: string; action: string }>,
  editor: [
    { resource: 'page',  action: 'create'  },
    { resource: 'page',  action: 'read'    },
    { resource: 'page',  action: 'update'  },
    { resource: 'media', action: 'create'  },
    { resource: 'media', action: 'update'  },
    { resource: 'media', action: 'read'    },
    // ── mới: theo yêu cầu "editor view-only users list, view editor's permissions" ──
    { resource: 'user',  action: 'read'    },
    { resource: 'role',  action: 'read'    },
  ],
  viewer: [
    { resource: 'page',  action: 'read'    },
    { resource: 'media', action: 'read'    },
  ],
};

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── 1. Upsert tất cả permissions ───────────────────────
  console.log('📋 Creating permissions...');
  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: p.resource, action: p.action } },
      update: {},
      create: { resource: p.resource, action: p.action },
    });
  }
  console.log(`   ✓ ${ALL_PERMISSIONS.length} permissions ready`);

  // ── 2. Upsert roles + gán permissions ──────────────────
  console.log('\n👥 Creating roles...');
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    // Xoá assignments cũ rồi tạo lại (đảm bảo đồng bộ khi seed lại)
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const p of perms) {
      const permission = await prisma.permission.findUnique({
        where: { resource_action: { resource: p.resource, action: p.action } },
      });
      if (!permission) continue;

      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
    }

    console.log(`   ✓ ${roleName}: ${perms.length} permissions`);
  }

  // ── 3. Admin user ───────────────────────────────────────
  console.log('\n🔑 Creating admin user...');
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
  const adminEmail    = process.env['SEED_ADMIN_EMAIL']    ?? 'admin@example.com';
  const adminPassword = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin@123456';
  const passwordHash  = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where:  { email: adminEmail },
    update: {},
    create: { email: adminEmail, password: passwordHash, roleId: adminRole.id },
  });
  console.log(`   ✓ ${adminUser.email} (password: ${adminPassword})`);

  // ── 4. Sample homepage ──────────────────────────────────
  console.log('\n📄 Creating sample homepage...');
  const existing = await prisma.page.findUnique({ where: { slug: 'homepage' } });

  if (!existing) {
    await prisma.page.create({
      data: {
        slug: 'homepage',
        versions: {
          create: {
            status: VersionStatus.DRAFT,
            seoMeta: { title: 'Home | CMS Site', description: 'Welcome to our site' },
            createdBy: adminUser.id,
            blocks: {
              create: [
                {
                  type: 'hero',
                  orderIndex: 0,
                  data: {
                    title: 'Welcome to our platform',
                    subtitle: 'Build amazing experiences with our CMS',
                    image: { mediaId: '00000000-0000-0000-0000-000000000000', alt: 'Hero' },
                    buttonText: 'Get Started',
                    buttonHref: '',
                    alignment: 'center',
                    overlayOpacity: 40,
                  },
                },
                {
                  type: 'rich-text',
                  orderIndex: 1,
                  data: {
                    content: {
                      type: 'doc',
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Our platform helps teams ship faster.' }] }],
                    },
                    htmlFallback: '<p>Our platform helps teams ship faster.</p>',
                    textAlign: 'left',
                  },
                },
                {
                  type: 'faq',
                  orderIndex: 2,
                  data: {
                    heading: 'Frequently Asked Questions',
                    items: [
                      { question: 'How do I get started?', answer: 'Sign up and follow the onboarding guide.' },
                      { question: 'Is there a free plan?', answer: 'Yes, 14 days free trial, no credit card required.' },
                    ],
                    allowMultipleOpen: false,
                  },
                },
              ],
            },
          },
        },
      },
    });
    console.log('   ✓ homepage (DRAFT) with 3 blocks');
  } else {
    console.log('   ℹ  homepage already exists, skipping');
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('   Login: admin@example.com / Admin@123456');
  console.log('   Swagger: http://localhost:3001/api/docs');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());