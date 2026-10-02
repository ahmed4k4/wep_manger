/**
 * Tasks Page - Main entry point with tabs for List, Kanban, and My Tasks
 */

import { getProjectById } from '@/lib/db/queries/projects';
import { TaskKanbanBoardContainer } from '@/components/tasks/TaskKanbanBoardContainer';
import { TasksListContainer } from '@/components/tasks/TasksList';
import { MyTasksContainer } from './my-tasks-container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, KanbanSquare, User } from 'lucide-react';
import { TasksHeader } from './tasks-header';

interface TasksPageProps {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ view?: string }>;
}

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default async function TasksPage({ params, searchParams }: TasksPageProps) {
  const [{ id: projectId, locale }, query] = await Promise.all([params, searchParams]);
  const isArabic = locale === 'ar';

  const { data: project, error } = await getProjectById(projectId);

  if (error || !project) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">
          Project not found
        </h1>
      </div>
    );
  }

  const memberIds = project.members?.map((m) => m.user_id) || [];

  return (
    <div className="min-h-[calc(100vh-68px)]">
      <main className="flex min-w-0 flex-col">
        <TasksHeader project={project} />
        
        {/* Tabs */}
        <div className="min-w-0 overflow-auto p-4">
          <Tabs defaultValue={query.view === 'kanban' ? 'kanban' : 'list'} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                {isArabic ? 'القائمة' : 'List'}
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <KanbanSquare className="mr-2 h-4 w-4" />
                {isArabic ? 'لوحة كانبان' : 'Kanban'}
              </TabsTrigger>
              <TabsTrigger value="my-tasks">
                <User className="mr-2 h-4 w-4" />
                {isArabic ? 'مهامي' : 'My Tasks'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <TasksListContainer projectId={projectId} memberIds={memberIds} />
            </TabsContent>

            <TabsContent value="kanban" className="space-y-4 h-[calc(100vh-200px)]">
              <TaskKanbanBoardContainer projectId={projectId} />
            </TabsContent>

            <TabsContent value="my-tasks" className="space-y-4">
              <MyTasksContainer projectId={projectId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
