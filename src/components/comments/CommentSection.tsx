/**
 * Comment Section Component
 * Displays and manages task comments with threading support
 */

'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Send, Edit2, Trash2, X, Reply, MoreVertical, Loader2 } from 'lucide-react';
import { TaskComment } from '@/types/project';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface CommentSectionProps {
  taskId: string;
  currentUserId: string;
  initialComments?: TaskComment[];
  onCommentChange?: () => void;
}

interface CommentWithReplies extends Omit<TaskComment, 'replies'> {
  replies: TaskComment[];
  isEditing?: boolean;
  editContent?: string;
}

export function CommentSection({ taskId, currentUserId, initialComments = [], onCommentChange }: CommentSectionProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [comments, setComments] = useState<CommentWithReplies[]>(
    initialComments.map(c => ({ ...c, replies: c.replies || [], isEditing: false }))
  );
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setRequestError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || (isArabic ? 'تعذر إضافة التعليق' : 'Could not add comment'));
      }

      if (response.ok) {
        const comment = await response.json();
        setComments(prev => [{ ...comment, replies: [], isEditing: false }, ...prev]);
        setNewComment('');
        onCommentChange?.();
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : (isArabic ? 'تعذر إضافة التعليق' : 'Could not add comment'));
      console.error('Failed to create comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: string, e: FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    setRequestError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim(), parent_id: parentId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || (isArabic ? 'تعذر إضافة الرد' : 'Could not add reply'));
      }

      if (response.ok) {
        const reply = await response.json();
        setComments(prev =>
          prev.map(c => {
            if (c.id === parentId) {
              return { ...c, replies: [...(c.replies || []), { ...reply, replies: [], isEditing: false }] };
            }
            return c;
          })
        );
        setReplyingTo(null);
        setReplyContent('');
        onCommentChange?.();
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : (isArabic ? 'تعذر إضافة الرد' : 'Could not add reply'));
      console.error('Failed to create reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string, content: string) => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    setRequestError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || (isArabic ? 'تعذر تحديث التعليق' : 'Could not update comment'));
      }

      if (response.ok) {
        setComments(prev =>
          prev.map(c => {
            if (c.id === commentId) return { ...c, content: content.trim(), isEditing: false, updated_at: new Date().toISOString() };
            if (c.replies) {
              return {
                ...c,
                replies: c.replies.map(r =>
                  r.id === commentId ? { ...r, content: content.trim(), isEditing: false, updated_at: new Date().toISOString() } : r
                ),
              };
            }
            return c;
          })
        );
        setEditingId(null);
        onCommentChange?.();
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : (isArabic ? 'تعذر تحديث التعليق' : 'Could not update comment'));
      console.error('Failed to update comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm(isArabic ? 'هل أنت متأكد من حذف هذا التعليق؟' : 'Are you sure you want to delete this comment?')) return;

    setDeletingId(commentId);
    setRequestError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || (isArabic ? 'تعذر حذف التعليق' : 'Could not delete comment'));
      }

      if (response.ok) {
        setComments(prev =>
          prev
            .filter(c => c.id !== commentId)
            .map(c => ({
              ...c,
              replies: c.replies?.filter(r => r.id !== commentId) || [],
            }))
        );
        onCommentChange?.();
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : (isArabic ? 'تعذر حذف التعليق' : 'Could not delete comment'));
      console.error('Failed to delete comment:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (comment: TaskComment) => {
    setEditingId(comment.id);
    setComments(prev =>
      prev.map(c => {
        if (c.id === comment.id) return { ...c, isEditing: true, editContent: c.content };
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map(r =>
              r.id === comment.id ? { ...r, isEditing: true, editContent: r.content } : r
            ),
          };
        }
        return c;
      })
    );
  };

  const cancelEdit = (commentId: string) => {
    setEditingId(null);
    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) return { ...c, isEditing: false, editContent: undefined };
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map(r =>
              r.id === commentId ? { ...r, isEditing: false, editContent: undefined } : r
            ),
          };
        }
        return c;
      })
    );
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: isArabic ? ar : enUS,
    });
  };

  const renderComment = (comment: CommentWithReplies, level = 0) => {
    const isAuthor = comment.user_id === currentUserId;
    const isEditing = editingId === comment.id;
    const content = isEditing ? comment.editContent : comment.content;

    return (
      <div
        key={comment.id}
        className={cn(
          'flex gap-3',
          level > 0 && 'ml-8 border-l-2 border-border pl-4',
          isArabic && 'flex-row-reverse mr-8 border-r-2 border-border pr-4 ml-0'
        )}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.user?.avatar_url || undefined} alt={comment.user?.full_name || ''} />
          <AvatarFallback>
            {comment.user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.user?.full_name || 'Unknown User'}</span>
            <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-muted-foreground">
                ({isArabic ? 'معدل' : 'edited'})
              </span>
            )}
            {comment.is_system && (
              <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                {isArabic ? 'نظام' : 'System'}
              </span>
            )}
          </div>

          {isEditing ? (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleUpdate(comment.id, comment.editContent || '');
              }}
              className="mt-2 flex gap-2"
            >
              <Textarea
                value={comment.editContent || ''}
                onChange={e =>
                  setComments(prev =>
                    prev.map(c => {
                      if (c.id === comment.id) return { ...c, editContent: e.target.value };
                      if (c.replies) {
                        return {
                          ...c,
                          replies: c.replies.map(r =>
                            r.id === comment.id ? { ...r, editContent: e.target.value } : r
                          ),
                        };
                      }
                      return c;
                    })
                  )
                }
                className="min-h-[60px] resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={submitting || deletingId === comment.id}>
                  {submitting && (editingId === comment.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : isArabic ? 'حفظ' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => cancelEdit(comment.id)}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <p className="mt-1 text-sm whitespace-pre-wrap">{content}</p>
              <div className="flex items-center gap-4 mt-2">
                {isAuthor && !comment.is_system && (
                  <>
                    <button
                      onClick={() => startEdit(comment)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      {isArabic ? 'تعديل' : 'Edit'}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                          <MoreVertical className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => startEdit(comment)}
                          disabled={submitting || deletingId === comment.id}
                        >
                          <Edit2 className="h-3 w-3" />
                          {isArabic ? 'تعديل' : 'Edit'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(comment.id)}
                          className="text-destructive focus:text-destructive"
                          disabled={submitting || deletingId === comment.id}
                        >
                          <Trash2 className="h-3 w-3" />
                          {isArabic ? 'حذف' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Reply className="h-3 w-3" />
                  {isArabic ? 'رد' : 'Reply'}
                </button>
              </div>

              {/* Reply form */}
              {replyingTo === comment.id && (
                <form onSubmit={e => handleReplySubmit(comment.id, e)} className="mt-3 flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    placeholder={isArabic ? 'اكتب ردك...' : 'Write a reply...'}
                    className="min-h-[60px] resize-none flex-1"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={submitting || !replyContent.trim()}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isArabic ? 'رد' : 'Reply'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyContent(''); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-4">
                  {comment.replies.map(reply => renderComment({ ...reply, replies: reply.replies || [] } as CommentWithReplies, level + 1))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={isArabic ? 'أضف تعليقاً...' : 'Add a comment...'}
            className="min-h-[80px] resize-none mb-2"
            rows={3}
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || !newComment.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isArabic ? 'إضافة تعليق' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </form>
      {requestError && <p role="alert" className="ms-11 text-sm text-destructive">{requestError}</p>}

      {/* Comments List */}
      <div className="space-y-6 border-t pt-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>{isArabic ? 'التعليقات' : 'Comments'}</span>
          <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
        </h3>

        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{isArabic ? 'لا توجد تعليقات بعد. كن أول من يعلق!' : 'No comments yet. Be the first to comment!'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
  );
}
