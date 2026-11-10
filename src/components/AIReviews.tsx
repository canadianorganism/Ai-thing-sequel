import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  user_id: string;
  display_name: string;
  rating: number;
  comment: string;
  created_at: string;
  hidden: boolean;
}

const StarRating = ({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(star => (
      <button
        key={star}
        type="button"
        disabled={!interactive}
        onClick={() => onRate?.(star)}
        className={`text-xl transition-colors ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${star <= rating ? 'text-yellow-400' : 'text-[#3a3a5a]'}`}
      >
        ★
      </button>
    ))}
  </div>
);

const AIReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [editing, setEditing] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [modLog, setModLog] = useState<{ id: string; action: string; review_display_name: string | null; review_comment: string | null; review_rating: number | null; created_at: string }[]>([]);
  const [bannedUserIds, setBannedUserIds] = useState<Set<string>>(new Set());
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    fetchReviews();
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        supabase.from('user_roles').select('role').eq('user_id', uid).eq('role', 'admin').then(({ data: roles }) => {
          const admin = (roles ?? []).length > 0;
          setIsAdmin(admin);
          if (admin) fetchBannedUsers();
        });
        // Check if current user is banned via RPC
        supabase.rpc('is_banned', { _user_id: uid }).then(({ data: banned }) => {
          setIsBanned(banned === true);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (userId && reviews.length > 0) {
      setExistingReview(reviews.find(r => r.user_id === userId) ?? null);
    } else {
      setExistingReview(null);
    }
  }, [userId, reviews]);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('ai_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    setReviews((data as Review[]) ?? []);
    setLoading(false);
  };

  const startEditing = () => {
    if (existingReview) {
      setName(existingReview.display_name);
      setRating(existingReview.rating);
      setComment(existingReview.comment);
      setEditing(true);
    }
  };

  const cancelEditing = () => {
    setName(''); setRating(0); setComment(''); setEditing(false); setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userId) { setError('Please sign in to leave a review.'); return; }
    if (rating === 0) { setError('Please select a rating.'); return; }
    if (!comment.trim()) { setError('Please write a comment.'); return; }

    setSubmitting(true);
    const displayName = name.trim() || 'Anonymous';

    // Content moderation check
    try {
      const { data: modResult } = await supabase.functions.invoke('moderate-comment', {
        body: { text: comment.trim(), display_name: displayName },
      });
      if (modResult?.blocked) {
        setError(modResult.reason || 'Your comment contains inappropriate language.');
        setSubmitting(false);
        return;
      }
    } catch {
      // If moderation service is down, allow submission
    }

    if (existingReview) {
      const { error: updateErr } = await supabase.from('ai_reviews')
        .update({ display_name: displayName.slice(0, 100), rating, comment: comment.trim().slice(0, 1000) })
        .eq('id', existingReview.id);
      if (updateErr) setError('Failed to update. Try again.');
      else { cancelEditing(); await fetchReviews(); }
    } else {
      const { error: insertErr } = await supabase.from('ai_reviews').insert({
        user_id: userId, display_name: displayName.slice(0, 100), rating, comment: comment.trim().slice(0, 1000),
      });
      if (insertErr) setError('Failed to submit. Try again.');
      else { setName(''); setComment(''); setRating(0); await fetchReviews(); }
    }
    setSubmitting(false);
  };

  const logModAction = async (action: string, review: Review) => {
    if (!userId) return;
    await supabase.from('moderation_log').insert({
      admin_user_id: userId,
      action,
      review_id: review.id,
      review_display_name: review.display_name,
      review_comment: review.comment,
      review_rating: review.rating,
    });
  };

  const fetchModLog = async () => {
    const { data } = await supabase.from('moderation_log').select('*').order('created_at', { ascending: false });
    setModLog((data as typeof modLog) ?? []);
  };

  const handleDelete = async (id: string) => {
    const review = reviews.find(r => r.id === id);
    if (isAdmin && review && review.user_id !== userId) {
      await logModAction('delete', review);
    }
    await supabase.from('ai_reviews').delete().eq('id', id);
    if (existingReview?.id === id) { setExistingReview(null); setEditing(false); }
    await fetchReviews();
  };

  const handleToggleHidden = async (id: string, currentlyHidden: boolean) => {
    const review = reviews.find(r => r.id === id);
    if (review) await logModAction(currentlyHidden ? 'unhide' : 'hide', review);
    await supabase.from('ai_reviews').update({ hidden: !currentlyHidden }).eq('id', id);
    await fetchReviews();
  };

  const fetchBannedUsers = async () => {
    const { data } = await supabase.from('banned_reviewers').select('user_id');
    setBannedUserIds(new Set((data ?? []).map((b: { user_id: string }) => b.user_id)));
  };

  const handleBan = async (targetUserId: string, reviewDisplayName: string) => {
    if (!userId) return;
    await supabase.from('banned_reviewers').insert({ user_id: targetUserId, banned_by: userId });
    await supabase.from('moderation_log').insert({
      admin_user_id: userId, action: 'ban', review_id: null,
      review_display_name: reviewDisplayName, review_comment: null, review_rating: null,
    });
    setBannedUserIds(prev => new Set(prev).add(targetUserId));
  };

  const handleUnban = async (targetUserId: string, reviewDisplayName: string) => {
    if (!userId) return;
    await supabase.from('banned_reviewers').delete().eq('user_id', targetUserId);
    await supabase.from('moderation_log').insert({
      admin_user_id: userId, action: 'unban', review_id: null,
      review_display_name: reviewDisplayName, review_comment: null, review_rating: null,
    });
    setBannedUserIds(prev => { const s = new Set(prev); s.delete(targetUserId); return s; });
  };

  const avgRating = reviews.filter(r => !r.hidden).length
    ? reviews.filter(r => !r.hidden).reduce((s, r) => s + r.rating, 0) / reviews.filter(r => !r.hidden).length
    : 0;
  const visibleReviews = isAdmin ? reviews : reviews.filter(r => !r.hidden);
  const showForm = userId && !isBanned && (!existingReview || editing);

  return (
    <div className="w-full max-w-3xl mt-16 space-y-8">
      <h2 className="text-2xl font-serif text-[#e8e8f0] tracking-wider text-center"
        style={{ textShadow: '0 0 20px rgba(168,200,255,0.2)' }}>
        COMMUNITY REVIEWS
      </h2>

      {visibleReviews.filter(r => !r.hidden).length > 0 && (
        <div className="flex items-center justify-center gap-4">
          <StarRating rating={Math.round(avgRating)} />
          <span className="text-[#a8c8ff] font-serif text-lg">{avgRating.toFixed(1)}</span>
          <span className="text-[#5a5a6a] font-serif text-sm">
            ({visibleReviews.filter(r => !r.hidden).length} review{visibleReviews.filter(r => !r.hidden).length !== 1 ? 's' : ''})
          </span>
        </div>
      )}

      {userId ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {isBanned && (
                <span className="text-red-400 font-serif text-xs">You are banned from leaving reviews.</span>
              )}
              {!isBanned && existingReview && !editing && (
                <button onClick={startEditing} className="text-[#a8c8ff] hover:text-[#c8e0ff] font-serif text-xs transition-colors">
                  ✎ Edit your review
                </button>
              )}
              {isAdmin && (
                <span className="text-[#ff9d5c] font-serif text-[10px] border border-[#ff9d5c]/30 px-1.5 py-0.5 rounded">ADMIN</span>
              )}
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); setUserId(null); setIsAdmin(false); }}
              className="text-[#5a5a6a] hover:text-[#a8c8ff] font-serif text-xs transition-colors">
              Sign out
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-[#12121e] border border-[#2a2a3a] p-6 space-y-4">
              <p className="text-[#6a6a7a] font-serif text-xs text-center">
                {editing ? 'Update your review' : 'Leave your review (one per account)'}
              </p>
              <div className="flex items-center gap-4">
                <label className="text-[#6a6a7a] font-serif text-sm w-20">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Anonymous"
                  className="flex-1 bg-[#0a0a12] border border-[#2a2a3a] text-[#e8e8f0] px-3 py-2 font-serif text-sm focus:border-[#a8c8ff] outline-none transition-colors" />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-[#6a6a7a] font-serif text-sm w-20">Rating</label>
                <StarRating rating={rating} onRate={setRating} interactive />
              </div>
              <div className="flex items-start gap-4">
                <label className="text-[#6a6a7a] font-serif text-sm w-20 pt-2">Comment</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} rows={3} placeholder="Share your experience..."
                  className="flex-1 bg-[#0a0a12] border border-[#2a2a3a] text-[#e8e8f0] px-3 py-2 font-serif text-sm focus:border-[#a8c8ff] outline-none transition-colors resize-none" />
              </div>
              {error && <p className="text-red-400 font-serif text-xs text-center">{error}</p>}
              <div className="text-center flex justify-center gap-3">
                {editing && (
                  <button type="button" onClick={cancelEditing}
                    className="px-6 py-2 bg-transparent border border-[#3a3a5a] text-[#6a6a7a] font-serif text-sm tracking-wider hover:text-[#e8e8f0] transition-all">
                    CANCEL
                  </button>
                )}
                <button type="submit" disabled={submitting}
                  className="px-8 py-2 bg-[#2a2a3a] border border-[#a8c8ff] text-[#e8e8f0] font-serif text-sm tracking-wider hover:bg-[#3a3a4a] transition-all disabled:opacity-50">
                  {submitting ? 'SAVING...' : editing ? 'UPDATE REVIEW' : 'SUBMIT REVIEW'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="bg-[#12121e] border border-[#2a2a3a] p-6 text-center space-y-3">
          <p className="text-[#6a6a7a] font-serif text-sm">Sign in to leave a review</p>
          <Link to="/auth" className="inline-block px-8 py-2 bg-[#2a2a3a] border border-[#a8c8ff] text-[#e8e8f0] font-serif text-sm tracking-wider hover:bg-[#3a3a4a] transition-all">
            SIGN IN
          </Link>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <p className="text-[#5a5a6a] font-serif text-center text-sm">Loading reviews...</p>
      ) : visibleReviews.length === 0 ? (
        <p className="text-[#5a5a6a] font-serif text-center text-sm">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {visibleReviews.map(r => (
            <div key={r.id} className={`bg-[#12121e] border p-4 space-y-2 ${r.hidden ? 'border-red-900/40 opacity-60' : 'border-[#2a2a3a]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[#e8e8f0] font-serif text-sm">{r.display_name}</span>
                  <StarRating rating={r.rating} />
                  {userId === r.user_id && (
                    <span className="text-[#a8c8ff] font-serif text-[10px] border border-[#2a2a3a] px-1.5 py-0.5 rounded">You</span>
                  )}
                  {r.hidden && isAdmin && (
                    <span className="text-red-400 font-serif text-[10px] border border-red-900/40 px-1.5 py-0.5 rounded">Hidden</span>
                  )}
                  {isAdmin && bannedUserIds.has(r.user_id) && (
                    <span className="text-red-400 font-serif text-[10px] border border-red-900/40 px-1.5 py-0.5 rounded">Banned</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#3a3a4a] font-serif text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  {/* Admin controls */}
                  {isAdmin && (
                    <>
                      <button onClick={() => handleToggleHidden(r.id, r.hidden)}
                        className="text-[#5a5a6a] hover:text-[#ff9d5c] text-xs font-serif transition-colors"
                        title={r.hidden ? 'Unhide' : 'Hide'}>
                        {r.hidden ? '👁' : '🙈'}
                      </button>
                      {r.user_id !== userId && (
                        bannedUserIds.has(r.user_id) ? (
                          <button onClick={() => handleUnban(r.user_id, r.display_name)}
                            className="text-green-600 hover:text-green-400 text-[10px] font-serif transition-colors" title="Unban user">
                            UNBAN
                          </button>
                        ) : (
                          <button onClick={() => handleBan(r.user_id, r.display_name)}
                            className="text-[#5a5a6a] hover:text-red-400 text-[10px] font-serif transition-colors" title="Ban user">
                            BAN
                          </button>
                        )
                      )}
                      <button onClick={() => handleDelete(r.id)}
                        className="text-[#3a3a4a] hover:text-red-400 text-xs transition-colors" title="Delete">
                        ✕
                      </button>
                    </>
                  )}
                  {/* Own review delete (non-admin) */}
                  {!isAdmin && userId === r.user_id && (
                    <button onClick={() => handleDelete(r.id)} className="text-[#3a3a4a] hover:text-red-400 text-xs transition-colors">✕</button>
                  )}
                </div>
              </div>
              <p className="text-[#8a8a9a] font-serif text-sm">{r.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Moderation Log (admin only) */}
      {isAdmin && (
        <div className="mt-8 space-y-3">
          <button
            onClick={() => { if (!showLog) fetchModLog(); setShowLog(!showLog); }}
            className="text-[#ff9d5c] hover:text-[#ffb88a] font-serif text-xs tracking-wider transition-colors"
          >
            {showLog ? '▲ HIDE MODERATION LOG' : '▼ VIEW MODERATION LOG'}
          </button>
          {showLog && (
            <div className="bg-[#12121e] border border-[#ff9d5c]/20 p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {modLog.length === 0 ? (
                <p className="text-[#5a5a6a] font-serif text-xs text-center">No moderation actions yet.</p>
              ) : modLog.map(entry => (
                <div key={entry.id} className="border-b border-[#2a2a3a] pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-serif text-[10px] px-1.5 py-0.5 rounded border ${
                        entry.action === 'delete' ? 'text-red-400 border-red-900/40' :
                        entry.action === 'hide' ? 'text-yellow-400 border-yellow-900/40' :
                        'text-green-400 border-green-900/40'
                      }`}>
                        {entry.action.toUpperCase()}
                      </span>
                      <span className="text-[#8a8a9a] font-serif text-xs">{entry.review_display_name ?? 'Unknown'}</span>
                      {entry.review_rating && <span className="text-yellow-400 text-xs">{'★'.repeat(entry.review_rating)}</span>}
                    </div>
                    <span className="text-[#3a3a4a] font-serif text-[10px]">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  {entry.review_comment && (
                    <p className="text-[#5a5a6a] font-serif text-[11px] mt-1 truncate">{entry.review_comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIReviews;
