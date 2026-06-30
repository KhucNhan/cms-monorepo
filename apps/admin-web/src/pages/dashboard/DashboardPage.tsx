import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePages } from '@/hooks/usePages';

// ─── Data ─────────────────────────────────────────────────────────────────────

// const SUMMARY_CARDS = [
//   {
//     label: 'Total Content Entries',
//     value: '12,482',
//     delta: '+12%',
//     deltaIcon: 'arrow_upward',
//     deltaColor: 'text-primary',
//     bg: 'bg-primary/5 group-hover:bg-primary/10',
//     icon: 'description',
//     iconColor: 'text-primary',
//     iconBg: 'bg-primary/10',
//     sub: 'Updated 5 minutes ago',
//   },
//   {
//     label: 'Active Users',
//     value: '2,105',
//     delta: '+5.4%',
//     deltaIcon: 'arrow_upward',
//     deltaColor: 'text-on-secondary-container',
//     bg: 'bg-secondary/5 group-hover:bg-secondary/10',
//     icon: 'group',
//     iconColor: 'text-on-secondary-container',
//     iconBg: 'bg-secondary-container',
//     sub: 'Across 14 regions globally',
//   },
//   {
//     label: 'Recent Activity',
//     value: '48',
//     delta: 'Today',
//     deltaIcon: 'history',
//     deltaColor: 'text-tertiary',
//     bg: 'bg-tertiary/5 group-hover:bg-tertiary/10',
//     icon: 'bolt',
//     iconColor: 'text-tertiary',
//     iconBg: 'bg-tertiary-container/20',
//     sub: '3 unscheduled maintenance alerts',
//   },
// ];


// const CHECKLIST = [
//   { done: true,  label: 'Connect your database' },
//   { done: false, label: 'Define first Content Type' },
//   { done: false, label: 'Invite collaborators' },
// ];

const QUICK_ACTIONS = [
  // {
  //   icon: 'add_box',
  //   iconBg: 'bg-primary/10',
  //   iconColor: 'text-primary',
  //   title: 'Create Content Type',
  //   sub: 'Define new data structures',
  //   href: '/content-type-builder',
  // },
  {
    icon: 'post_add',
    iconBg: 'bg-secondary-container',
    iconColor: 'text-on-secondary-container',
    title: 'Add new Entry',
    sub: 'Populate your collections',
    href: '/content-manager?create=true',
  },
  // {
  //   icon: 'menu_book',
  //   iconBg: 'bg-outline-variant/20',
  //   iconColor: 'text-on-surface',
  //   title: 'Documentation',
  //   sub: 'API guides and tutorials',
  //   href: '#',
  // },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const { pages, total, loading: pagesLoading } = usePages({ page: 1, pageSize: 4 });
  return (
    <AppLayout
      title="Dashboard"
      // actions={
      //   <>
      //     <Button variant="secondary" icon="download" size="md">Export Data</Button>
      //     <Button variant="primary"   icon="add"      size="md">Create New</Button>
      //   </>
      // }
    >
      <div className="p-xl">
        <div className="max-w-max_content_width mx-auto space-y-xl">
          {/* Welcome */}
          <div>
            <h1 className="text-h1 font-h1 text-on-background">Welcome back, Admin!</h1>
            {/* <p className="text-on-surface-variant text-body-md mt-sm">
              Here's what's happening with your content today.
            </p> */}
          </div>

          {/* Summary Cards */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {SUMMARY_CARDS.map((card, idx) => (
              <div
                key={card.label}
                className="bg-surface p-xl rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group hover:-translate-y-0.5"
              >
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl transition-colors ${card.bg}`} />
                <div className="flex items-center gap-md mb-md">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                    <span className={`material-symbols-outlined ${card.iconColor}`}>{card.icon}</span>
                  </div>
                  <h4 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-widest"> */}
                    {/* Inject real total for first card */}
                    {/* {idx === 0
                      ? `Total Pages: ${pagesLoading ? '…' : total}`
                      : card.label}
                  </h4>
                </div>
                <div className="flex items-baseline gap-sm">
                  <span className="text-h1 font-h1 text-on-background">{card.value}</span>
                  <span className={`text-label-md font-label-md flex items-center ${card.deltaColor}`}>
                    <span className="material-symbols-outlined text-[14px]">{card.deltaIcon}</span>
                    {card.delta}
                  </span>
                </div>
                <p className="text-[12px] text-on-surface-variant mt-sm">{card.sub}</p>
              </div>
            ))}
          </div> */}

          {/* Main Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
            {/* Recent Collections Table */}
            <div className="lg:col-span-2 bg-surface h-fit rounded-xl border border-outline-variant shadow-sm flex flex-col">
              <div className="p-lg border-b border-outline-variant flex items-center justify-between">
                <h3 className="text-h3 font-h3 text-on-surface">Recent Collections</h3>
                <button onClick={() => navigate('/content-manager')} className="text-primary text-label-md font-label-md hover:underline">
                  View all
                </button>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low">
                    <tr>
                      {['Page Slug', 'Status', 'Versions', 'Actions'].map((h, i) => (
                        <th
                          key={h}
                          className={`px-lg py-3 text-label-md font-label-md text-on-surface-variant uppercase tracking-wider ${i === 3 ? 'text-right' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {pagesLoading ? (
                      <tr>
                        <td colSpan={4} className="px-lg py-6 text-center text-on-surface-variant text-body-md">
                          Loading pages…
                        </td>
                      </tr>
                    ) : pages.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-lg py-6 text-center text-on-surface-variant text-body-md">
                          No pages yet.
                        </td>
                      </tr>
                    ) : (
                      pages.map((page) => (
                        <tr key={page.id} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-lg py-4">
                            <div className="flex items-center gap-sm">
                              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">article</span>
                              <span className="text-body-md text-on-surface font-mono">/{page.slug}</span>
                            </div>
                          </td>
                          <td className="px-lg py-4">
                            <span className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-label-md font-label-md
                              ${page.publishedVersion?.status === 'PUBLISHED'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-outline-variant/30 text-on-surface-variant'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {page.publishedVersion?.status ?? 'DRAFT'}
                            </span>
                          </td>
                          <td className="px-lg py-4 text-body-md text-on-surface-variant">
                            {page._count?.versions ?? 0}
                          </td>
                          <td className="px-lg py-4 text-right">
                            <button
                              onClick={() => navigate(`/pages/${page.id}/edit`)}
                              className="p-1 hover:bg-surface-container-high rounded transition-all opacity-0 group-hover:opacity-100"
                            >
                              <span className="material-symbols-outlined text-primary text-[20px]">edit</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-lg bg-surface-container-low/50 border-t border-outline-variant flex justify-between items-center">
                <p className="text-[12px] text-on-surface-variant">
                  {pagesLoading ? 'Loading…' : `Showing ${Math.min(4, pages.length)} of ${total} pages`}
                </p>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-lg">
              {/* Getting Started card */}
              {/* <div className="bg-primary-container text-on-primary-container p-xl rounded-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-h3 font-h3 mb-sm">Getting Started</h3>
                  <p className="text-body-md opacity-90 mb-lg">
                    Complete your profile and start creating content.
                  </p>
                  <div className="space-y-sm">
                    {CHECKLIST.map(({ done, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-md p-sm bg-white/10 rounded-lg backdrop-blur-sm border border-white/20"
                      >
                        <span
                          className={`material-symbols-outlined p-1 rounded text-[18px] ${done ? 'bg-white/20' : 'bg-white/10 opacity-50'}`}
                        >
                          {done ? 'check' : 'radio_button_unchecked'}
                        </span>
                        <span className="text-label-md font-label-md">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              </div> */}

              {/* Quick Actions */}
              <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg">
                <h3 className="text-h3 font-h3 text-on-surface mb-md">Quick Actions</h3>
                <div className="space-y-sm">
                  {QUICK_ACTIONS.map((action) => (
                    <a
                      key={action.title}
                      href={action.href}
                      className="flex items-center gap-md p-md hover:bg-surface-container-high rounded-lg transition-all border border-transparent hover:border-outline-variant group"
                    >
                      <div
                        className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center ${action.iconColor} group-hover:scale-110 transition-transform`}
                      >
                        <span className="material-symbols-outlined">{action.icon}</span>
                      </div>
                      <div>
                        <p className="text-label-md font-label-md text-on-surface">{action.title}</p>
                        <p className="text-[11px] text-on-surface-variant">{action.sub}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
