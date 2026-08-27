import { redirect } from 'next/navigation';

export default function HomePage() {
  // Demo mode uchun to'g'ridan-to'g'ri dashboard'ga o'tamiz
  redirect('/dashboard');
}
