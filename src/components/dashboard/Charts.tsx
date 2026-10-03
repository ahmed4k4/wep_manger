/**
 * Dashboard Charts Components
 * Lightweight SVG-based charts for the dashboard
 */

'use client';

import { useTranslations } from 'next-intl';

// ============================================================================
// Types
// ============================================================================

interface TasksByStatusData {
  TODO: number;
  IN_PROGRESS: number;
  REVIEW: number;
  BLOCKED: number;
  COMPLETED: number;
}

interface TasksByPriorityData {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  URGENT: number;
}

interface ProjectProgressData {
  project_id: string;
  project_name: string;
  project_key: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
}

interface CompletionTrendData {
  date: string;
  completed: number;
  created: number;
}

interface TeamWorkloadData {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  assigned_count: number;
  todo_count: number;
  in_progress_count: number;
  overdue_count: number;
}

// ============================================================================
// Color Palettes
// ============================================================================

const STATUS_COLORS = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  REVIEW: '#f59e0b',
  BLOCKED: '#ef4444',
  COMPLETED: '#22c55e',
};

const PRIORITY_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
};

// ============================================================================
// Utility Functions
// ============================================================================

function getMaxValue(data: Record<string, number>): number {
  return Math.max(...Object.values(data), 1);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// Pie/Donut Chart
// ============================================================================

interface DonutChartProps {
  data: Record<string, number> | TasksByStatusData | TasksByPriorityData;
  colors: Record<string, string>;
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function DonutChart({
  data,
  colors,
  size = 200,
  strokeWidth = 16,
  showLegend = true,
  className,
  'aria-label': ariaLabel,
}: DonutChartProps) {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  
  if (total === 0) {
    return (
      <div className={className} role="img" aria-label={ariaLabel}>
        <div className="flex items-center justify-center h-full w-full text-muted-foreground">
          No data
        </div>
      </div>
    );
  }
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let currentAngle = -Math.PI / 2; // Start at top
  
  const segments = Object.entries(data).map(([key, value]) => {
    const percentage = value / total;
    const angle = percentage * 2 * Math.PI;
    const startAngle = currentAngle;
    currentAngle += angle;
    const endAngle = currentAngle;
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const startX = size / 2 + radius * Math.cos(startAngle);
    const startY = size / 2 + radius * Math.sin(startAngle);
    const endX = size / 2 + radius * Math.cos(endAngle);
    const endY = size / 2 + radius * Math.sin(endAngle);
    
    const pathData = `M ${size / 2} ${size / 2} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    
    return { key, value, percentage, pathData, color: colors[key] || '#64748b' };
  });
  
  return (
    <div className={className} role="img" aria-label={ariaLabel}>
      <div className="relative inline-block">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((segment, index) => (
            <path
              key={segment.key}
              d={segment.pathData}
              fill={segment.color}
              className="transition-opacity duration-200"
              style={{ opacity: segment.value > 0 ? 1 : 0 }}
            />
          ))}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 4}
            fill="var(--background)"
          />
        </svg>
        {total > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        )}
      </div>
      {showLegend && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          {segments.map(segment => (
            <div key={segment.key} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="font-medium text-foreground capitalize">{segment.key.replace('_', ' ')}</span>
              <span className="text-muted-foreground ml-auto">
                {segment.value} ({(segment.percentage * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Bar Chart (Horizontal)
// ============================================================================

interface HorizontalBarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
    secondaryValue?: number;
  }>;
  maxValue?: number;
  height?: number;
  showValue?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function HorizontalBarChart({
  data,
  maxValue,
  height = 200,
  showValue = true,
  className,
  'aria-label': ariaLabel,
}: HorizontalBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  const barHeight = 28;
  const gap = 8;
  
  return (
    <div className={className} role="img" aria-label={ariaLabel} style={{ height }}>
      <div className="h-full flex flex-col justify-end gap-2" role="list">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center gap-3" role="listitem">
            <div className="w-32 text-right text-sm font-medium text-foreground truncate pr-2">
              {item.label}
            </div>
            <div className="flex-1 relative h-6">
              <div
                className="absolute inset-0 bg-muted rounded-full"
                aria-hidden="true"
              />
              <div
                className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%`,
                  backgroundColor: item.color || '#3b82f6',
                }}
                role="img"
                aria-label={`${item.label}: ${item.value}`}
              />
              {showValue && item.value > 0 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-2 text-xs font-medium text-foreground">
                  {item.secondaryValue !== undefined 
                    ? `${item.value} / ${item.secondaryValue}` 
                    : item.value}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Line Chart (Area)
// ============================================================================

interface LineChartProps {
  data: CompletionTrendData[];
  height?: number;
  className?: string;
  'aria-label'?: string;
}

export function LineChart({
  data,
  height = 200,
  className,
  'aria-label': ariaLabel,
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className={className} style={{ height }} role="img" aria-label={ariaLabel}>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No data
        </div>
      </div>
    );
  }
  
  const maxCompleted = Math.max(...data.map(d => d.completed), 1);
  const maxCreated = Math.max(...data.map(d => d.created), 1);
  const maxValue = Math.max(maxCompleted, maxCreated);
  
  const padding = { top: 20, right: 40, bottom: 40, left: 50 };
  const chartWidth = '100%';
  const chartHeight = height;
  const innerWidth = `calc(100% - ${padding.left + padding.right}px)`;
  const innerHeight = height - padding.top - padding.bottom;
  
  // Generate points for completed line
  const completedPoints = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * (height - padding.top - padding.bottom); // This will be calculated in CSS
    const y = padding.top + innerHeight - (d.completed / maxValue) * innerHeight;
    return `${x},${y}`;
  }).join(' ');
  
  // Actually let's use a simpler approach with CSS variables
  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * 100,
    yCompleted: 100 - (d.completed / maxValue) * 90,
    yCreated: 100 - (d.created / maxValue) * 90,
  }));
  
  const completedPath = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.yCompleted}%`
  ).join(' ');
  
  const createdPath = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.yCreated}%`
  ).join(' ');
  
  const completedAreaPath = 
    `M ${points[0].x}% 100% ` +
    points.map(p => `L ${p.x}% ${p.yCompleted}%`).join(' ') +
    ` L ${points[points.length - 1].x}% 100% Z`;
  
  const createdAreaPath = 
    `M ${points[0].x}% 100% ` +
    points.map(p => `L ${p.x}% ${p.yCreated}%`).join(' ') +
    ` L ${points[points.length - 1].x}% 100% Z`;
  
  return (
    <div className={className} style={{ height }} role="img" aria-label={ariaLabel}>
      <div className="relative h-full w-full">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <g stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-gray-700">
            {[25, 50, 75].map(y => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} />
            ))}
          </g>
          
          {/* Areas */}
          <path d={createdAreaPath} fill="url(#createdGradient)" />
          <path d={completedAreaPath} fill="url(#completedGradient)" />
          
          {/* Lines */}
          <path d={createdPath} stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={completedPath} stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Dots */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={`${p.x}%`} cy={`${p.yCompleted}%`} r="3" fill="#22c55e" />
              <circle cx={`${p.x}%`} cy={`${p.yCreated}%`} r="3" fill="#3b82f6" />
            </g>
          ))}
        </svg>
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-[50px] right-[40px] flex justify-between text-xs text-muted-foreground">
          {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => (
            <span key={i} className="text-center">{formatDate(d.date)}</span>
          ))}
        </div>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-[20px] bottom-[40px] flex flex-col justify-between text-xs text-muted-foreground pr-2">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue / 2)}</span>
          <span>0</span>
        </div>
        
        {/* Legend */}
        <div className="absolute top-0 right-0 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-green-500" />
            <span className="text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500" />
            <span className="text-muted-foreground">Created</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Project Progress Bars
// ============================================================================

interface ProjectProgressProps {
  projects: ProjectProgressData[];
  className?: string;
}

export function ProjectProgress({ projects, className }: ProjectProgressProps) {
  const t = useTranslations('dashboard.projectProgress');
  
  if (projects.length === 0) {
    return (
      <div className={className}>
        <p className="text-center text-muted-foreground py-8">{t('noProjects')}</p>
      </div>
    );
  }
  
  return (
    <div className={className} role="list" aria-label={t('label')}>
      {projects.map(project => (
        <div key={project.project_id} className="mb-4" role="listitem">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded">
                {project.project_key}
              </span>
              <span className="font-medium text-sm truncate">{project.project_name}</span>
            </div>
            <span className="text-sm font-medium text-foreground ml-2 shrink-0">
              {project.progress}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${project.progress}%`,
                backgroundColor: project.progress === 100 ? '#22c55e' : '#3b82f6',
              }}
              role="progressbar"
              aria-valuenow={project.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${project.project_name}: ${project.progress}% complete`}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('tasks', { completed: project.completed_tasks, total: project.total_tasks })}
          </p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Team Workload
// ============================================================================

interface TeamWorkloadProps {
  members: TeamWorkloadData[];
  className?: string;
}

export function TeamWorkload({ members, className }: TeamWorkloadProps) {
  const t = useTranslations('dashboard.teamWorkload');
  
  if (members.length === 0) {
    return (
      <div className={className}>
        <p className="text-center text-muted-foreground py-8">{t('noMembers')}</p>
      </div>
    );
  }
  
  return (
    <div className={className} role="list" aria-label={t('label')}>
      {members.map(member => (
        <div key={member.user_id} className="flex items-center gap-3 py-2" role="listitem">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt="" className="w-full h-full rounded-full" />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {getInitials(member.full_name)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {member.in_progress_count} {t('inProgress')}
              </span>
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {member.todo_count} {t('todo')}
              </span>
              {member.overdue_count > 0 && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {member.overdue_count} {t('overdue')}
                </span>
              )}
            </div>
          </div>
          <span className="text-sm font-medium text-foreground shrink-0">
            {member.assigned_count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Chart Wrapper Components
// ============================================================================

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function ChartCard({ title, description, children, className, action }: ChartCardProps) {
  const t = useTranslations('dashboard');
  
  return (
    <div className={`bg-card rounded-xl border p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t(title)}</h3>
          {description && <p className="text-sm text-muted-foreground mt-1">{t(description)}</p>}
        </div>
        {action}
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Specific Chart Components
// ============================================================================

export function TasksByStatusChart({ data }: { data: TasksByStatusData }) {
  return (
    <ChartCard title="tasksByStatus.title" description="tasksByStatus.description">
      <DonutChart
        data={data}
        colors={STATUS_COLORS}
        size={180}
        aria-label="Tasks by status distribution"
      />
    </ChartCard>
  );
}

export function TasksByPriorityChart({ data }: { data: TasksByPriorityData }) {
  return (
    <ChartCard title="tasksByPriority.title" description="tasksByPriority.description">
      <DonutChart
        data={data}
        colors={PRIORITY_COLORS}
        size={180}
        aria-label="Tasks by priority distribution"
      />
    </ChartCard>
  );
}

export function CompletionTrendChart({ data }: { data: CompletionTrendData[] }) {
  return (
    <ChartCard title="completionTrend.title" description="completionTrend.description">
      <LineChart data={data} height={250} aria-label="Task completion trend over time" />
    </ChartCard>
  );
}

export function ProjectProgressChart({ data }: { data: ProjectProgressData[] }) {
  return (
    <ChartCard title="projectProgress.title" description="projectProgress.description">
      <ProjectProgress projects={data} />
    </ChartCard>
  );
}

export function TeamWorkloadChart({ data }: { data: TeamWorkloadData[] }) {
  return (
    <ChartCard title="teamWorkload.title" description="teamWorkload.description">
      <TeamWorkload members={data} />
    </ChartCard>
  );
}