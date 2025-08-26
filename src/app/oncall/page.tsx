import { getUserAndProfile } from '@/lib/access';
import { redirect } from 'next/navigation';
import OnCallViewer from '@/components/OnCallViewer';

export default async function OnCallPage() {
  const { user, profile } = await getUserAndProfile();
  console.log('[OnCall SSR] user:', user, 'profile:', profile);

  if (!user) {
    redirect('/?showSignIn=true');
  }
  if (!profile || profile.status !== 'approved') {
    redirect('/unauthorized');
  }

  return <OnCallViewer />;
}