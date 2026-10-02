/**
 * Tasks Page - Main entry point with tabs for List, Kanban, and My Tasks
 */

import { getProjectById } from '@/lib/db/queries/projects';
import { ProjectSidebar } from '@/components/projects/ProjectSidebar';
import { ProjectSidebarSkeleton } from '@/components/projects/ProjectSidebarSkeleton';
import { TaskKanbanBoardContainer } from '@/components/tasks/TaskKanbanBoardContainer';
import { TasksListContainer } from '@/components/tasks/TasksList';
import { MyTasksContainer } from './my-tasks-container';
import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, KanbanSquare, User } from 'lucide-react';
import { TasksHeader } from './tasks-header';

interface TasksPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default async function TasksPage({ params }: TasksPageProps) {
  const { id: projectId } = await params;

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
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<ProjectSidebarSkeleton />}>
        <ProjectSidebar project={project} />
      </Suspense>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TasksHeader project={project} />
        
        {/* Tabs */}
        <div className="flex-1 overflow-auto p-4">
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <KanbanSquare className="mr-2 h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="my-tasks">
                <User className="mr-2 h-4 w-4" />
                My Tasks
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
