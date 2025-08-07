import LayoutShell from '@/components/LayoutShell';
import AuthGuard from '@/components/AuthGuard';

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <LayoutShell>{children}</LayoutShell>
    </AuthGuard>
  );
}