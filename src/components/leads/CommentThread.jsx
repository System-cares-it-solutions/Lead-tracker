import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import * as api from '../../services/api';
import Spinner from '../common/Spinner';
import Button from '../common/Button';
import {
  MessageSquare, Send, ThumbsUp, Heart, Smile,
  Pin, Edit3, Trash2, Reply, MoreVertical,
} from 'lucide-react';

const REACTION_EMOJIS = ['👍', '❤️', '🔥', '🚀', '👀', '✅'];

export default function CommentThread({ leadId }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const data = await api.fetchComments(leadId);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [leadId]);

  const handleCreateComment = async (parentId = null) => {
    const text = parentId ? replyText : newComment;
    if (!text.trim()) return;

    try {
      setSubmitting(true);
      await api.addComment({
        leadId,
        parentId,
        authorId: user?.id || user?.email || 'user',
        authorName: user?.name || 'User',
        authorRole: user?.role || 'employee',
        content: text.trim(),
      });

      if (parentId) {
        setReplyText('');
        setReplyToId(null);
      } else {
        setNewComment('');
      }
      showToast('Comment posted', 'success');
      loadComments();
    } catch (err) {
      showToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editText.trim()) return;
    try {
      await api.editComment(commentId, editText.trim());
      setEditingId(null);
      setEditText('');
      showToast('Comment updated', 'success');
      loadComments();
    } catch (err) {
      showToast(err.message || 'Failed to update', 'error');
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.deleteComment(commentId);
      showToast('Comment deleted', 'success');
      loadComments();
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  const handleTogglePin = async (commentId) => {
    try {
      await api.togglePinComment(commentId);
      loadComments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReaction = async (commentId, emoji) => {
    try {
      await api.reactToComment(commentId, emoji, user?.id || 'anonymous');
      loadComments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const renderComment = (comment, isReply = false) => {
    const isAuthor = comment.authorId === user?.id || comment.authorName === user?.name;
    const isEditing = editingId === comment.id;
    const isReplying = replyToId === comment.id;

    return (
      <div
        key={comment.id}
        style={{
          display: 'flex',
          gap: '0.75rem',
          padding: '0.85rem',
          borderRadius: 'var(--radius-md)',
          background: comment.isPinned
            ? 'rgba(99, 102, 241, 0.08)'
            : isReply
            ? 'var(--color-surface-elevated)'
            : 'var(--color-surface)',
          border: `1px solid ${comment.isPinned ? 'var(--color-primary)' : 'var(--color-border)'}`,
          marginBottom: '0.5rem',
          marginLeft: isReply ? '1.5rem' : '0',
          position: 'relative',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: comment.authorRole === 'admin' ? 'var(--color-primary)' : 'var(--color-info)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.8rem',
            flexShrink: 0,
          }}
        >
          {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{comment.authorName}</span>
              {comment.authorRole && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.35rem',
                    borderRadius: 'var(--radius-full)',
                    background: comment.authorRole === 'admin' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                    color: comment.authorRole === 'admin' ? 'var(--color-primary)' : 'var(--color-info)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {comment.authorRole}
                </span>
              )}
              {comment.isPinned && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--color-primary)', fontSize: '0.7rem', fontWeight: 600 }}>
                  <Pin size={11} /> Pinned
                </span>
              )}
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dimmed)' }}>
                {new Date(comment.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {comment.isEdited && (
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dimmed)', fontStyle: 'italic' }}>
                  (edited)
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {!isReply && (
                <button
                  onClick={() => handleTogglePin(comment.id)}
                  title={comment.isPinned ? 'Unpin' : 'Pin'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: comment.isPinned ? 'var(--color-primary)' : 'var(--color-text-dimmed)', padding: '0.2rem' }}
                >
                  <Pin size={13} />
                </button>
              )}
              {isAuthor && (
                <>
                  <button
                    onClick={() => { setEditingId(comment.id); setEditText(comment.content); }}
                    title="Edit"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dimmed)', padding: '0.2rem' }}
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    title="Delete"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '0.2rem' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content / Edit form */}
          {isEditing ? (
            <div style={{ marginTop: '0.4rem' }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '0.85rem',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.3rem' }}>
                <Button variant="ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
                <Button style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleEdit(comment.id)}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
              {comment.content}
            </p>
          )}

          {/* Reactions bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {REACTION_EMOJIS.map((emoji) => {
              const reactions = comment.reactions || {};
              const userList = reactions[emoji] || [];
              const hasReacted = userList.includes(user?.id);

              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(comment.id, emoji)}
                  style={{
                    background: hasReacted ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: `1px solid ${hasReacted ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                    borderRadius: 'var(--radius-full)',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <span>{emoji}</span>
                  {userList.length > 0 && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text)' }}>
                      {userList.length}
                    </span>
                  )}
                </button>
              );
            })}

            {!isReply && (
              <button
                onClick={() => setReplyToId(isReplying ? null : comment.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  marginLeft: '0.25rem',
                  fontWeight: 600,
                }}
              >
                <Reply size={12} /> Reply
              </button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && (
            <div style={{ marginTop: '0.6rem', padding: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Replying to ${comment.authorName}...`}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-elevated)',
                  color: 'var(--color-text)',
                  fontSize: '0.8rem',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.3rem' }}>
                <Button variant="ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setReplyToId(null)}>
                  Cancel
                </Button>
                <Button
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  disabled={submitting}
                  onClick={() => handleCreateComment(comment.id)}
                >
                  Post Reply
                </Button>
              </div>
            </div>
          )}

          {/* Render Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: '0.6rem' }}>
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* New Comment Input */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add an internal note or update for the team..."
          rows={2}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '0.85rem',
            resize: 'vertical',
          }}
        />
        <Button
          onClick={() => handleCreateComment(null)}
          disabled={submitting || !newComment.trim()}
          style={{ height: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Send size={15} />
        </Button>
      </div>

      {/* Comments List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          <MessageSquare size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
          <p>No comments yet. Start a discussion with your team!</p>
        </div>
      ) : (
        <div>{comments.map((c) => renderComment(c, false))}</div>
      )}
    </div>
  );
}
