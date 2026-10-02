/**
 * Activity Timeline Client Component
 * Fetches and displays activity logs with pagination
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActivityTimeline } from './ActivityTimeline';
import { ActivityLogWithUser } from '@/lib/db/queries/activity';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface ActivityTimelineClientProps {
  projectId: string;
  pageSize?: number;
}

export function ActivityTimelineClient({ projectId, pageSize = 50 }: ActivityTimelineClientProps) {
  const [activities, setActivities] = useState<ActivityLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
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
    setIsLoading(true);
    setPage(1);
    fetchActivities(1, false);
  }, [fetchActivities]);

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