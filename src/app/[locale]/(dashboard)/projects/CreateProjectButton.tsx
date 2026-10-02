/**
 * Create Project Button
 * Client component for the create project button
 */

'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CreateProjectButton() {
  return (
    <Link href="/projects/new">
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>
    </Link>
  );
}