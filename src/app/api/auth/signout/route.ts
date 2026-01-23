import { signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function POST() {
  await signOut({ redirectTo: '/auth/login' });
}