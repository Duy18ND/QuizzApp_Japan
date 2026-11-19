import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  BookMarked,
  BookOpen,
  Crown,
  Database,
  FileText,
  History,
  Languages,
  RefreshCw,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { Badge, Button, Card, Notice, PageContainer, PageHeader, Stat } from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import {
  getCmsSnapshotSync,
  loadCmsSnapshot,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import { refreshCurriculumFromCloud } from '../../services/curriculumStore';
import {
  fetchSupabaseProfilesCount,
  fetchSupabaseTableCounts,
  type StaticDatasetCounts,
} from '../../services/migrationService';
import { supabase } from '../../services/supabaseClient';
import { cn } from '../../lib/cn';
import type { JLPTLevel } from '../../types/quiz';
import { AdminGrammarManager } from './AdminGrammarManager';
import { AdminJlptManager } from './AdminJlptManager';
import { AdminKanjiManager } from './AdminKanjiManager';
import { AdminMigrationTester } from './AdminMigrationTester';
import { AdminUnitsManager } from './AdminUnitsManager';
import { AdminUsersAuditManager } from './AdminUsersAuditManager';
import { AdminVocabManager } from './AdminVocabManager';

export type AdminModuleTab =
  | 'units'
  | 'vocabularies'
  | 'kanjis'
  | 'grammar_rules'
  | 'jlpt_questions'
  | 'migration'
  | 'users_audit';

interface AdminDashboardPageProps {
  defaultTab?: AdminModuleTab;
}

export function AdminDashboardPage({ defaultTab = 'units' }: AdminDashboardPageProps) {
  const { user: actor, isSupabaseConfigured } = useAuth();
  const isSuperAdmin = actor?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<AdminModuleTab>(defaultTab);
  const [snapshot, setSnapshot] = useState<CmsSnapshot>(() => getCmsSnapshotSync());
  const [cloudCounts, setCloudCounts] = useState<StaticDatasetCounts | null>(null);
  const [profilesCount, setProfilesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [vocabJumpFilter, setVocabJumpFilter] = useState<{
    level?: JLPTLevel;
    dbUnitId?: string;
    nonce?: number;
  } | null>(null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cms, countsRes, profCount] = await Promise.all([
        loadCmsSnapshot(),
        fetchSupabaseTableCounts(),
        fetchSupabaseProfilesCount(),
      ]);
      setSnapshot(cms);
      if (countsRes.ok) {
        setCloudCounts(countsRes.counts);
      }
      setProfilesCount(profCount);
      await refreshCurriculumFromCloud();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadCmsSnapshot(),
      fetchSupabaseTableCounts(),
      fetchSupabaseProfilesCount(),
    ]).then(([cms, countsRes, profCount]) => {
      if (cancelled) return;
      setSnapshot(cms);
      if (countsRes.ok) {
        setCloudCounts(countsRes.counts);
      }
      setProfilesCount(profCount);
      void refreshCurriculumFromCloud();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleJumpToUnitVocab = (level: JLPTLevel, _unitNumber: number, dbUnitId: string) => {
    setVocabJumpFilter({ level, dbUnitId, nonce: Date.now() });
    setActiveTab('vocabularies');
  };

  const navItems: Array<{
    id: AdminModuleTab;
    label: string;
    shortLabel: string;
    icon: ReactNode;
    badge?: number | string;
  }> = [
    {
      id: 'units',
      label: 'Học phần (Units)',
      shortLabel: 'Units',
      icon: <BookOpen className="h-4 w-4 shrink-0" />,
      badge: cloudCounts?.units ?? snapshot.units.length,
    },
    {
      id: 'vocabularies',
      label: 'Từ vựng (Vocabularies)',
      shortLabel: 'Từ vựng',
      icon: <FileText className="h-4 w-4 shrink-0" />,
      badge: cloudCounts?.vocabularies ?? snapshot.vocabularies.length,
    },
    {
      id: 'kanjis',
      label: 'Chữ Hán (Kanjis)',
      shortLabel: 'Kanji',
      icon: <Languages className="h-4 w-4 shrink-0" />,
      badge: cloudCounts?.kanjis ?? snapshot.kanjis.length,
    },
    {
      id: 'grammar_rules',
      label: 'Ngữ pháp (Grammar Rules)',
      shortLabel: 'Ngữ pháp',
      icon: <BookMarked className="h-4 w-4 shrink-0" />,
      badge: cloudCounts?.grammarRules ?? snapshot.grammars.length,
    },
    {
      id: 'jlpt_questions',
      label: 'Ngân hàng Đề JLPT (9 Modules)',
      shortLabel: 'Đề JLPT',
      icon: <Target className="h-4 w-4 shrink-0" />,
      badge: cloudCounts?.jlptQuestions ?? snapshot.jlptQuestions.length,
    },
    {
      id: 'migration',
      label: 'Đồng bộ & Auto-Test CRUD',
      shortLabel: 'Đồng bộ & Test',
      icon: <Database className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'users_audit',
      label: isSuperAdmin
        ? 'Phân quyền Users & Nhật ký'
        : 'Nhật ký thao tác (Audit Logs)',
      shortLabel: isSuperAdmin ? 'Phân quyền Users' : 'Nhật ký',
      icon: isSuperAdmin ? (
        <Crown className="h-4 w-4 shrink-0" />
      ) : (
        <History className="h-4 w-4 shrink-0" />
      ),
    },
  ];

  const kpiCards = [
    {
      label: 'Học phần (units)',
      value: cloudCounts ? cloudCounts.units : snapshot.units.length,
      hint: cloudCounts ? `CMS: ${snapshot.units.length} (Supabase)` : 'Dữ liệu Local CMS',
    },
    {
      label: 'Từ vựng (vocabularies)',
      value: cloudCounts ? cloudCounts.vocabularies : snapshot.vocabularies.length,
      hint: cloudCounts
        ? `CMS: ${snapshot.vocabularies.length} (Supabase)`
        : 'Dữ liệu Local CMS',
    },
    {
      label: 'Chữ Hán (kanjis)',
      value: cloudCounts ? cloudCounts.kanjis : snapshot.kanjis.length,
      hint: cloudCounts ? `CMS: ${snapshot.kanjis.length} (Supabase)` : 'Dữ liệu Local CMS',
    },
    {
      label: 'Ngữ pháp (grammar_rules)',
      value: cloudCounts ? cloudCounts.grammarRules : snapshot.grammars.length,
      hint: cloudCounts ? `CMS: ${snapshot.grammars.length} (Supabase)` : 'Dữ liệu Local CMS',
    },
    {
      label: 'Đề JLPT (jlpt_questions)',
      value: cloudCounts ? cloudCounts.jlptQuestions : snapshot.jlptQuestions.length,
      hint: cloudCounts
        ? `CMS: ${snapshot.jlptQuestions.length} (Supabase)`
        : 'Dữ liệu Local CMS',
    },
    {
      label: 'Tài khoản (profiles)',
      value: profilesCount ?? '—',
      hint: profilesCount !== null ? 'Supabase Profiles' : 'Cần kết nối Cloud',
    },
  ];

  return (
    <PageContainer size="lg" className="space-y-6 py-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Quản trị Admin CMS' },
        ]}
        title="Admin CMS & Quản trị học liệu"
        description="Quản trị đầy đủ 5 bảng học liệu PostgreSQL Supabase, Migration đồng bộ hai chiều, Auto-Test CRUD và Nhật ký kiểm toán — mọi thay đổi được đồng bộ trực tiếp tới trang học viên."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isSupabaseConfigured || supabase ? (
              <Badge tone="success">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Đã kết nối Supabase Cloud ({snapshot.source === 'supabase' ? 'Cloud Live' : 'Hybrid'})
              </Badge>
            ) : (
              <Badge tone="warning">Chế độ Local CMS</Badge>
            )}
            <Badge tone={isSuperAdmin ? 'sakura' : 'primary'}>
              {actor?.role ?? 'GUEST'} · {actor?.displayName ?? 'Admin'}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              loading={loading}
              onClick={() => void refreshAll()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới
            </Button>
          </div>
        }
      />

      {snapshot.remoteError && (
        <Notice tone="warning">
          Không thể tải đầy đủ từ Supabase Cloud ({snapshot.remoteError}). Hệ thống đang dùng dữ liệu
          CMS cục bộ làm bản dự phòng.
        </Notice>
      )}

      {/* Top KPI Summary Bar across all 6 Supabase tables */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpiCards.map((kpi) => (
          <Stat key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} />
        ))}
      </div>

      {/* Modular 7-Tab Workspace (Responsive Sidebar on Desktop, Horizontal Tab Strip on Mobile) */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[276px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <Card padding="sm" className="lg:sticky lg:top-20">
            <div
              role="tablist"
              aria-label="Phân hệ quản trị Admin CMS"
              className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
            >
              {navItems.map((item) => {
                const selected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`admin-tab-${item.id}`}
                    aria-selected={selected}
                    aria-controls={`admin-panel-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors lg:w-full lg:shrink lg:text-sm',
                      selected
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-fg hover:bg-surface-2',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2 whitespace-nowrap lg:whitespace-normal">
                      {item.icon}
                      <span className="lg:hidden">{item.shortLabel}</span>
                      <span className="hidden leading-snug lg:inline">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px]',
                          selected
                            ? 'bg-surface/20 text-on-primary'
                            : 'bg-surface-2 text-muted',
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </aside>

        <section
          id={`admin-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`admin-tab-${activeTab}`}
          className="min-w-0 space-y-6"
        >
          {activeTab === 'units' && (
            <AdminUnitsManager
              snapshot={snapshot}
              actor={actor}
              onRefresh={refreshAll}
              onJumpToUnitVocab={handleJumpToUnitVocab}
            />
          )}

          {activeTab === 'vocabularies' && (
            <AdminVocabManager
              key={vocabJumpFilter?.nonce ?? 'default'}
              snapshot={snapshot}
              actor={actor}
              onRefresh={refreshAll}
              initialFilter={vocabJumpFilter}
            />
          )}

          {activeTab === 'kanjis' && (
            <AdminKanjiManager snapshot={snapshot} actor={actor} onRefresh={refreshAll} />
          )}

          {activeTab === 'grammar_rules' && (
            <AdminGrammarManager snapshot={snapshot} actor={actor} onRefresh={refreshAll} />
          )}

          {activeTab === 'jlpt_questions' && (
            <AdminJlptManager snapshot={snapshot} actor={actor} onRefresh={refreshAll} />
          )}

          {activeTab === 'migration' && (
            <AdminMigrationTester snapshot={snapshot} actor={actor} onRefresh={refreshAll} />
          )}

          {activeTab === 'users_audit' && <AdminUsersAuditManager actor={actor} />}
        </section>
      </div>
    </PageContainer>
  );
}
