import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  FileText,
  Languages,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { GrammarJlptManager } from '../../components/admin/GrammarJlptManager';
import { KanjiManager } from '../../components/admin/KanjiManager';
import { SuperAdminRoleManager } from '../../components/admin/SuperAdminRoleManager';
import { VocabularyManager } from '../../components/admin/VocabularyManager';
import {
  Badge,
  Button,
  Card,
  Notice,
  PageContainer,
  PageHeader,
  Stat,
  Tabs,
  type TabItem,
} from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import {
  getCmsSnapshotSync,
  loadCmsSnapshot,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import { downloadJsonFile } from '../../utils/batchImportUtils';

type AdminTab = 'vocabulary' | 'kanji' | 'grammar_jlpt' | 'users';

export function AdminDashboardPage() {
  const { user, isSupabaseConfigured } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<AdminTab>('vocabulary');
  const [snapshot, setSnapshot] = useState<CmsSnapshot>(() => getCmsSnapshotSync());
  const [refreshing, setRefreshing] = useState(false);

  const refreshSnapshot = useCallback(async () => {
    setRefreshing(true);
    const next = await loadCmsSnapshot();
    setSnapshot(next);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCmsSnapshot().then((next) => {
      if (!cancelled) setSnapshot(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        description="Quản lý Từ vựng, Kanji, Ngữ pháp, Đề JLPT, Import hàng loạt (JSON/CSV) và phân quyền."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isSuperAdmin ? 'sakura' : 'primary'}>
              <ShieldCheck className="size-3.5" aria-hidden />
              {user?.role}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              loading={refreshing}
              leftIcon={<RefreshCw className="size-3.5" aria-hidden />}
              onClick={() => void refreshSnapshot()}
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
        <Notice tone={isSupabaseConfigured ? 'success' : 'info'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {isSupabaseConfigured
                ? 'Đã kết nối Supabase PostgreSQL + RLS (mọi thay đổi nội dung được ghi đồng bộ lên CSDL & audit_logs).'
                : 'Chế độ Local CMS (chưa gắn biến môi trường Supabase): mọi chỉnh sửa CRUD & Batch Import được lưu an toàn ngay trên trình duyệt để kiểm thử và có thể xuất ra file .json bất cứ lúc nào.'}
            </span>
            <Badge tone="neutral">Nguồn: {snapshot.source === 'supabase' ? 'Supabase' : 'Local'}</Badge>
          </div>
        </Notice>

        <Card padding="md">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Từ vựng" value={snapshot.vocabularies.length} />
            <Stat
              label="Kanji"
              value={snapshot.kanjis.length}
              hint={`${missingKanjiViCount} chữ thiếu Hán Việt`}
            />
            <Stat label="Mẫu ngữ pháp" value={snapshot.grammars.length} />
            <Stat label="Câu hỏi JLPT" value={snapshot.jlptQuestions.length} />
          </div>
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
            onRefresh={refreshSnapshot}
          />
        )}

        {safeTab === 'kanji' && (
          <KanjiManager
            kanjis={snapshot.kanjis}
            actor={user}
            snapshot={snapshot}
            onRefresh={refreshSnapshot}
          />
        )}

        {safeTab === 'grammar_jlpt' && (
          <GrammarJlptManager
            grammars={snapshot.grammars}
            jlptQuestions={snapshot.jlptQuestions}
            actor={user}
            snapshot={snapshot}
            onRefresh={refreshSnapshot}
          />
        )}

        {safeTab === 'users' && isSuperAdmin && <SuperAdminRoleManager actor={user} />}
      </div>
    </PageContainer>
  );
}
