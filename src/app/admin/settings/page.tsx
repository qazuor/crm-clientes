import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // Redirect to the enrichment settings by default
  redirect('/admin/settings/enrichment');
}
