import type { Metadata } from 'next';
import DataDeletionContent from '@/components/DataDeletionContent';

export const metadata: Metadata = {
  title: "Ma'lumotlarni o'chirish — JavobGo",
  description: "JavobGo hisobingizni va barcha ma'lumotlaringizni qanday o'chirish mumkinligi bo'yicha ko'rsatma.",
};

export default function DataRemovalPage() {
  return <DataDeletionContent />;
}
