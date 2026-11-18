import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  CloudUpload,
  Database,
  Download,
  FileText,
  FlaskConical,
  Languages,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { GrammarJlptManager } from '../../components/admin/GrammarJlptManager';
import { KanjiManager } from '../../components/admin/KanjiManager';
import { SuperAdminRoleManager } from '../../components/admin/SuperAdminRoleManager';
import { VocabularyManager } from '../../components/admin/VocabularyManager';
import { SupabaseStatusBadge } from '../../components/common/SupabaseStatusBadge';
import {
  Badge,
  Button,
  Card,
  Notice,
  PageContainer,
  PageHeader,
  ProgressBar,
  Stat,
  Tabs,
  useToast,
  type TabItem,
} from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import {
  getCmsSnapshotSync,
  loadCmsSnapshot,
  runAdminCrudAutoTest,
  type CmsSnapshot,
  type CrudAutoTestResult,
} from '../../services/adminCmsService';
import {
  fetchSupabaseTableCounts,
  getLocalStaticCounts,
  migrateAllStaticDataToSupabase,
  type MigrationProgressUpdate,
  type StaticDatasetCounts,
} from '../../services/migrationService';
import { downloadJsonFile } from '../../utils/batchImportUtils';

type AdminTab = 'vocabulary' | 'kanji' | 'grammar_jlpt' | 'users';

export function AdminDashboardPage() {
  const { user, isSupabaseConfigured } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const localCounts = useMemo(() => getLocalStaticCounts(), []);
  const [activeTab, setActiveTab] = useState<AdminTab>('vocabulary');
  const [snapshot, setSnapshot] = useState<CmsSnapshot>(() => getCmsSnapshotSync());
  const [supabaseCounts, setSupabaseCounts] = useState<StaticDatasetCounts | null>(null);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgressUpdate | null>(null);
  const [migrationBanner, setMigrationBanner] = useState<{
    tone: 'success' | 'danger';
    text: string;
  } | null>(null);

  const [runningAutoTest, setRunningAutoTest] = useState(false);
  const [autoTestResult, setAutoTestResult] = useState<CrudAutoTestResult | null>(null);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    const [nextSnapshot, countsRes] = await Promise.all([
      loadCmsSnapshot(),
      isSupabaseConfigured ? fetchSupabaseTableCounts() : Promise.resolve(null),
    ]);
    setSnapshot(nextSnapshot);
    if (countsRes) {
      if (countsRes.ok) {
        setSupabaseCounts(countsRes.counts);
        setCountsError(null);
      } else {
        setCountsError(countsRes.error ?? 'Không thể tải số liệu bảng Supabase.');
      }
    }
    setRefreshing(false);
  }, [isSupabaseConfigured]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadCmsSnapshot(),
      isSupabaseConfigured ? fetchSupabaseTableCounts() : Promise.resolve(null),
    ]).then(([nextSnapshot, countsRes]) => {
      if (cancelled) return;
      setSnapshot(nextSnapshot);
      if (countsRes) {
        if (countsRes.ok) {
          setSupabaseCounts(countsRes.counts);
          setCountsError(null);
        } else {
          setCountsError(countsRes.error ?? 'Không thể tải số liệu bảng Supabase.');
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isSupabaseConfigured]);

  const handleMigrateAll = async () => {
    if (migrating) return;
    setMigrating(true);
    setMigrationBanner(null);
    setMigrationProgress({
      completedSteps: 0,
      totalSteps: 1,
      currentTable: 'units',
      label: 'Đang chuẩn bị dữ liệu gốc để đẩy lên Supabase...',
    });

    const result = await migrateAllStaticDataToSupabase({
      actor: user,
      onProgress: (progress) => setMigrationProgress(progress),
    });

    setMigrating(false);

    if (!result.ok) {
      const msg = result.error ?? 'Chuyển dữ liệu lên Supabase thất bại.';
      setMigrationBanner({ tone: 'danger', text: msg });
      toast({ title: 'Migrate All thất bại', description: msg, tone: 'danger' });
      return;
    }

    const summary = `Đã chuyển thành công ${result.counts.units} units, ${result.counts.vocabularies} từ vựng, ${result.counts.kanjis} Kanji, ${result.counts.grammarRules} ngữ pháp và ${result.counts.jlptQuestions} câu hỏi JLPT lên Supabase.`;
    setMigrationBanner({ tone: 'success', text: summary });
    toast({ title: 'Migrate All thành công!', description: summary, tone: 'success' });
    await refreshAll();
  };

  const handleRunCrudAutoTest = async () => {
    if (runningAutoTest) return;
    setRunningAutoTest(true);
    const result = await runAdminCrudAutoTest(user);
    setAutoTestResult(result);
    setRunningAutoTest(false);

    toast({
      title: result.ok ? 'Auto-Test CRUD PASS!' : 'Auto-Test CRUD có bước FAIL',
      description: result.summary,
      tone: result.ok ? 'success' : 'danger',
    });
    await refreshAll();
  };

  const tabs: TabItem<AdminTab>[] = useMemo(() => {
    const base: TabItem<AdminTab>[] = [
      {
        value: 'vocabulary',
        label: `Từ vựng (${snapshot.vocabularies.length})`,
        icon: <BookOpen className="size-4" aria-hidden />,
      },
      {
        value: 'kanji',
        label: `Kanji (${snapshot.kanjis.length})`,
        icon: <Languages className="size-4" aria-hidden />,
      },
      {
        value: 'grammar_jlpt',
        label: `Ngữ pháp & JLPT (${snapshot.grammars.length + snapshot.jlptQuestions.length})`,
        icon: <FileText className="size-4" aria-hidden />,
      },
    ];
    if (isSuperAdmin) {
      base.push({
        value: 'users',
        label: 'Phân quyền Users',
        icon: <Users className="size-4" aria-hidden />,
      });
    }
    return base;
  }, [
    isSuperAdmin,
    snapshot.grammars.length,
    snapshot.jlptQuestions.length,
    snapshot.kanjis.length,
    snapshot.vocabularies.length,
  ]);

  const safeTab: AdminTab =
    activeTab === 'users' && !isSuperAdmin ? 'vocabulary' : activeTab;

  const missingKanjiViCount = useMemo(
    () => snapshot.kanjis.filter((k) => k.hanViet.trim() === '').length,
    [snapshot.kanjis],
  );

  const handleFullBackup = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadJsonFile(`nihonmaster-cms-backup-${dateSlug}.json`, {
      exportedAt: new Date().toISOString(),
      source: snapshot.source,
      counts: {
        vocabularies: snapshot.vocabularies.length,
        kanjis: snapshot.kanjis.length,
        grammars: snapshot.grammars.length,
        jlptQuestions: snapshot.jlptQuestions.length,
      },
      vocabularies: snapshot.vocabularies,
      kanjis: snapshot.kanjis,
      grammar_rules: snapshot.grammars,
      jlpt_questions: snapshot.jlptQuestions,
    });
  };

  return (
    <PageContainer size="lg" className="py-2">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Hồ sơ', to: '/profile' },
          { label: 'Admin CMS' },
        ]}
        title="Admin CMS & Quản trị học liệu"
        description="Đồng bộ dữ liệu lên Supabase PostgreSQL, CRUD Từ vựng / Kanji / Ngữ pháp / JLPT và kiểm thử E2E."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SupabaseStatusBadge connected={isSupabaseConfigured} />
            <Badge tone={isSuperAdmin ? 'sakura' : 'primary'}>
              <ShieldCheck className="size-3.5" aria-hidden />
              {user?.role}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              loading={refreshing}
              leftIcon={<RefreshCw className="size-3.5" aria-hidden />}
              onClick={() => void refreshAll()}
            >
              Làm mới
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="size-3.5" aria-hidden />}
              onClick={handleFullBackup}
            >
              Xuất toàn bộ (.json)
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        {/* 1. Prominent Migration & Live Counts Panel */}
        <Card padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Database className="size-4 text-primary-fg" aria-hidden />
                <h2 className="text-base font-bold text-fg">
                  1. Đồng bộ dữ liệu gốc lên Supabase
                </h2>
                <Badge tone="neutral">
                  Nguồn bảng hiện tại: {snapshot.source === 'supabase' ? 'Supabase DB' : 'Local'}
                </Badge>
              </div>
              <p className="text-xs text-muted">
                So sánh số dòng trực tiếp trên các bảng PostgreSQL so với dữ liệu tĩnh hiện có trong mã nguồn.
              </p>
            </div>

            <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                loading={migrating}
                disabled={!isSupabaseConfigured || migrating}
                className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
                leftIcon={<CloudUpload className="size-4 shrink-0" aria-hidden />}
                onClick={() => void handleMigrateAll()}
              >
                Chuyển toàn bộ dữ liệu hiện tại lên Supabase (Migrate All)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={runningAutoTest}
                disabled={!isSupabaseConfigured || runningAutoTest}
                className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal sm:whitespace-nowrap"
                leftIcon={<FlaskConical className="size-4 shrink-0" aria-hidden />}
                onClick={() => void handleRunCrudAutoTest()}
              >
                Chạy Auto-Test Thêm / Sửa / Xóa (E2E CRUD Test)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label="Units (Supabase / Local)"
              value={`${supabaseCounts?.units ?? '—'} / ${localCounts.units}`}
              hint="public.units"
            />
            <Stat
              label="Từ vựng (Supabase / Local)"
              value={`${supabaseCounts?.vocabularies ?? '—'} / ${localCounts.vocabularies}`}
              hint="public.vocabularies"
            />
            <Stat
              label="Kanji (Supabase / Local)"
              value={`${supabaseCounts?.kanjis ?? '—'} / ${localCounts.kanjis}`}
              hint={`${missingKanjiViCount} thiếu Hán Việt`}
            />
            <Stat
              label="Ngữ pháp (Supabase / Local)"
              value={`${supabaseCounts?.grammarRules ?? '—'} / ${localCounts.grammarRules}`}
              hint="public.grammar_rules"
            />
            <Stat
              label="JLPT (Supabase / Local)"
              value={`${supabaseCounts?.jlptQuestions ?? '—'} / ${localCounts.jlptQuestions}`}
              hint="public.jlpt_questions"
            />
          </div>

          {(countsError || snapshot.remoteError) && (
            <Notice tone="warning">
              Không thể truy vấn đầy đủ từ Supabase: {countsError || snapshot.remoteError}. Hãy chắc chắn đã chạy <code>supabase/schema.sql</code> trong Supabase SQL Editor.
            </Notice>
          )}

          {migrationProgress && (migrating || migrationBanner !== null) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span>{migrationProgress.label}</span>
                <span className="tabular font-medium text-fg">
                  {Math.round(
                    (migrationProgress.completedSteps /
                      Math.max(1, migrationProgress.totalSteps)) *
                      100,
                  )}
                  %
                </span>
              </div>
              <ProgressBar
                value={migrationProgress.completedSteps}
                max={migrationProgress.totalSteps}
                label="Tiến độ chuyển dữ liệu lên Supabase"
                tone={migrationBanner?.tone === 'danger' ? 'danger' : 'primary'}
                size="sm"
              />
            </div>
          )}

          {migrationBanner && <Notice tone={migrationBanner.tone}>{migrationBanner.text}</Notice>}

          {autoTestResult && (
            <div className="space-y-2.5 rounded-xl border border-line bg-surface-2 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {autoTestResult.ok ? (
                    <CheckCircle2 className="size-4 text-success-fg" aria-hidden />
                  ) : (
                    <XCircle className="size-4 text-danger-fg" aria-hidden />
                  )}
                  <span className="text-sm font-semibold text-fg">
                    {autoTestResult.summary}
                  </span>
                </div>
                <Badge tone={autoTestResult.ok ? 'success' : 'danger'}>
                  {autoTestResult.ok ? 'ALL PASS' : 'FAILED'} · {autoTestResult.totalDurationMs}ms
                </Badge>
              </div>

              <div className="grid gap-1.5">
                {autoTestResult.steps.map((step) => (
                  <div
                    key={step.name}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                      step.status === 'PASS'
                        ? 'border-success-line bg-success-soft text-success-fg'
                        : 'border-danger-line bg-danger-soft text-danger-fg'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Badge tone={step.status === 'PASS' ? 'success' : 'danger'}>
                        {step.status}
                      </Badge>
                      <span>{step.name}</span>
                      <span className="font-mono opacity-80">({step.target})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{step.detail}</span>
                      <span className="tabular font-mono">{step.durationMs}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Tabs
          items={tabs}
          value={safeTab}
          onChange={setActiveTab}
          aria-label="Không gian quản trị CMS"
          idPrefix="admin-cms"
        />

        {safeTab === 'vocabulary' && (
          <VocabularyManager
            vocabularies={snapshot.vocabularies}
            actor={user}
            snapshot={snapshot}
            onRefresh={refreshAll}
          />
        )}

        {safeTab === 'kanji' && (
          <KanjiManager
            kanjis={snapshot.kanjis}
            actor={user}
            snapshot={snapshot}
            onRefresh={refreshAll}
          />
        )}

        {safeTab === 'grammar_jlpt' && (
          <GrammarJlptManager
            grammars={snapshot.grammars}
            jlptQuestions={snapshot.jlptQuestions}
            actor={user}
            snapshot={snapshot}
            onRefresh={refreshAll}
          />
        )}

        {safeTab === 'users' && isSuperAdmin && <SuperAdminRoleManager actor={user} />}
      </div>
    </PageContainer>
  );
}
