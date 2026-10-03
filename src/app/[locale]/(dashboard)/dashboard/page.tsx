/**
 * Professional Project Management Dashboard
 * Server Component - fetches data and renders dashboard sections based on user role
 */

import { getFullDashboardData } from '@/app/actions/dashboard/get-dashboard-data';
import { getCurrentUser, checkIsAdmin, checkIsProjectManager } from '@/lib/authorization';
import { KPICardsGrid } from '@/components/dashboard/KPICards';
import {
  TasksByStatusChart,
  TasksByPriorityChart,
  CompletionTrendChart,
  ProjectProgressChart,
  TeamWorkloadChart,
} from '@/components/dashboard/Charts';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { OverdueSection } from '@/components/dashboard/OverdueSection';
import { MyWork } from '@/components/dashboard/MyWork';
import { FullDashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { Card } from '@/components/ui/card';

export default async function DashboardPage() {
  // Get current user first
  const user = await getCurrentUser().catch(() => null);
  
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Please log in to view the dashboard</p>
        </Card>
      </div>
    );
  }

  // Fetch all dashboard data in parallel with role checks
  const [
    dashboardData,
    isAdmin,
    isPM,
  ] = await Promise.all([
    getFullDashboardData(),
    checkIsAdmin(user.id),
    checkIsProjectManager(user.id),
  ]);

  const userRole = isAdmin ? 'admin' : isPM ? 'project_manager' : 'user';

  if (!dashboardData.success || !dashboardData.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </Card>
      </div>
    );
  }

  const data = dashboardData.data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {userRole === 'admin' 
              ? 'System-wide overview and analytics' 
              : userRole === 'project_manager'
              ? 'Project portfolio and team management'
              : 'Your personal work overview'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
            {userRole === 'admin' ? 'Admin' : userRole === 'project_manager' ? 'Project Manager' : 'Member'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICardsGrid kpis={data.kpis} />

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TasksByStatusChart data={data.tasksByStatus} />
        <TasksByPriorityChart data={data.tasksByPriority} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CompletionTrendChart data={data.completionTrend} />
        {userRole !== 'user' && <ProjectProgressChart data={data.projectProgress} />}
        {userRole === 'user' && <TeamWorkloadChart data={data.teamWorkload} />}
      </div>

      {/* Bottom Row - Activity, Upcoming, Overdue */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RecentActivity activities={data.recentActivity} />
        <UpcomingDeadlines deadlines={data.upcomingDeadlines} />
        <OverdueSection items={data.overdueItems} />
      </div>

      {/* My Work Section */}
      <MyWork data={data.myWork} />

      {/* Admin Stats (only for admins) */}
      {userRole === 'admin' && data.adminStats && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-foreground">System Overview</h3>
          </div>
          <div className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <AdminStatCard 
                label="Total Users" 
                value={data.adminStats.total_users} 
                icon={<UsersIcon />}
                color="blue"
              />
              <AdminStatCard 
                label="Active Users" 
                value={data.adminStats.active_users} 
                icon={<CheckCircleIcon />}
                color="green"
              />
              <AdminStatCard 
                label="Total Projects" 
                value={data.adminStats.total_projects} 
                icon={<FolderIcon />}
                color="purple"
              />
              <AdminStatCard 
                label="Total Tasks" 
                value={data.adminStats.total_tasks} 
                icon={<CheckSquareIcon />}
                color="orange"
              />
              <AdminStatCard 
                label="Storage Used" 
                value={`${data.adminStats.storage_used_gb} GB`} 
                icon={<DatabaseIcon />}
                color="gray"
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Admin stat card component
function AdminStatCard({ 
  label, 
  value, 
  icon, 
  color 
}: { 
  label: string; 
  value: number | string; 
  icon: React.ReactNode; 
  color: string; 
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
    green: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    purple: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
    orange: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
    gray: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Icons
function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function CheckSquareIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  );
}