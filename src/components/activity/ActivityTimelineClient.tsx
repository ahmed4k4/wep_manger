/**
 * Activity Timeline Client Component
 * Fetches and displays activity logs with pagination
 * Supports initial server-rendered data for faster first paint
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActivityTimeline } from './ActivityTimeline';
import { ActivityLogWithUser } from '@/lib/db/queries/activity';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface ActivityTimelineClientProps {
  projectId: string;
  pageSize?: number;
  initialActivities?: ActivityLogWithUser[];
}

export function ActivityTimelineClient({ projectId, pageSize = 50, initialActivities = [] }: ActivityTimelineClientProps) {
  const [activities, setActivities] = useState<ActivityLogWithUser[]>(initialActivities);
  const [isLoading, setIsLoading] = useState(initialActivities.length === 0);
  const [hasMore, setHasMore] = useState(initialActivities.length >= pageSize);
  const [page, setPage] = useState(1);

  const fetchActivities = useCallback(async (pageNum: number, append = false) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/activity?page=${pageNum}&page_size=${pageSize}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      
      if (append) {
        setActivities(prev => [...prev, ...data.data]);
      } else {
        setActivities(data.data);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, pageSize]);

  useEffect(() => {
    if (initialActivities.length === 0) {
      setIsLoading(true);
      setPage(1);
      fetchActivities(1, false);
    }
  }, [fetchActivities, initialActivities.length]);

  const loadMore = () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  };

  return (
    <ActivityTimeline
      activities={activities}
      isLoading={isLoading}
      hasMore={hasMore}
      onLoadMore={loadMore}
    />
  );
}
