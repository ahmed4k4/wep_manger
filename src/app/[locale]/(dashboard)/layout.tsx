/**
 * Dashboard Layout
 * Root layout for all dashboard pages
 */

import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        {children}
      </div>
      <Toaster position="top-right" />
    </SidebarProvider>
  );
}