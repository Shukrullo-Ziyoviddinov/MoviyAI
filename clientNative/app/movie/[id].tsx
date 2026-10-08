import {
  AgeRatingIcon,
  BookmarkIcon,
  CalendarIcon,
  ChatBubbleIcon,
  ChevronLeftIcon,
  ClockIcon,
  DislikeIcon,
  GlobeIcon,
  LikeIcon,
  PlayIcon,
  SendIcon,
  ShareIcon,
  VideoIcon,
} from '@/components/icons';
import { HorizontalScroll } from '@/components/common/HorizontalScroll';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { ActorChip } from '@/components/actor/ActorChip';
import { CommentModal } from '@/components/movie/CommentModal';
import { MovieDescriptionModal } from '@/components/movie/MovieDescriptionModal';
import { SimilarMovieCard } from '@/components/movie/SimilarMovieCard';
import { TrailerModal } from '@/components/movie/TrailerModal';
import {
  fetchCommentReplies,
  fetchMovieById,
  fetchMovieComments,
  fetchSimilarMovies,
  toggleMovieReaction,
} from '@/src/api/movies';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import type { Movie, MovieComment } from '@/src/types/movie';
import { resolveMoviePoster } from '@/src/utils/moviePosters';
import { BlockSkeleton, PhotoGate } from '@/components/common/BlockSkeleton';
import { UserAvatar } from '@/components/common/UserAvatar';
import {
  Oswald_700Bold,
  useFonts,
} from '@expo-google-fonts/oswald';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PREVIEW_COMMENTS = 5;

function formatCommentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function userLabel(userId: string) {
  const tail = userId.replace(/^user_/, '').slice(-4);
  return tail ? `User ${tail}` : 'User';
}

function authorName(comment: { authorName?: string; userId: string }) {
  const name = String(comment.authorName ?? '').trim();
  return name || userLabel(comment.userId);
}

function mentionLabel(userId: string) {
  return `@${userLabel(userId)}`;
}

const SAVE_ACTIVE = '#1E4FD6';
const LIKE_ACTIVE = '#22C55E';
const DISLIKE_ACTIVE = '#EF4444';

type SpecIconProps = { size?: number; color?: string };
type SpecItem = {
  key: string;
  label: string;
  Icon: ComponentType<SpecIconProps>;
};

async function openExternalUrl(url?: string) {
  const target = url?.trim();
  if (!target) return;
  try {
    await Linking.openURL(target);
  } catch {
    // ignore invalid / unsupported urls
  }
}

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const { width } = useWindowDimensions();
  const isSaved = useWishlistStore((s) => s.isSaved(movieId));
  const toggle = useWishlistStore((s) => s.toggle);
  const requireAuth = useAuthStore((s) => s.requireAuth);
  const [fontsLoaded] = useFonts({
    Oswald_700Bold,
  });
  const [movie, setMovie] = useState<Movie | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [loadingMoreId, setLoadingMoreId] = useState<string | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [readyPoster, setReadyPoster] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!Number.isFinite(movieId)) {
      setError('Invalid movie id');
      return;
    }

    setMovie(null);
    setError(null);
    setComments([]);
    setSimilarMovies([]);
    Promise.all([
      fetchMovieById(movieId),
      fetchMovieComments(movieId, 50).catch(() => ({
        comments: [] as MovieComment[],
        commentCount: 0,
      })),
      fetchSimilarMovies(movieId, 16).catch(() => [] as Movie[]),
    ])
      .then(([doc, commentsResult, similar]) => {
        if (!alive) return;
        setMovie({
          ...doc,
          commentCount: commentsResult.commentCount ?? doc.commentCount,
        });
        setComments(commentsResult.comments ?? []);
        setSimilarMovies(similar);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Load failed');
        setMovie(null);
        setComments([]);
        setSimilarMovies([]);
      });

    return () => {
      alive = false;
    };
  }, [movieId]);

  const lang = language === 'en' ? 'uz' : language;
  const title = movie ? movie.title[lang] ?? movie.title.uz : '';
  const poster = movie ? resolveMoviePoster(movie.homeImgPoster) : null;
  const posterKey = movie?.homeImgPoster ?? '';
  const posterReady = posterKey.length > 0 && readyPoster === posterKey;
  const posterH = Math.round(width * 1.15);
  const fadeH = Math.round(posterH * 0.42);
  const description = movie
    ? movie.description[lang] ?? movie.description.uz
    : null;
  const durationLabel = description
    ? language === 'ru'
      ? `${description.duration} мин`
      : language === 'en'
        ? `${description.duration} min`
        : `${description.duration} daq`
    : '';

  const fadeColors = useMemo(
    () =>
      [
        'transparent',
        hexToRgba(colors.bg, 0.2),
        hexToRgba(colors.bg, 0.5),
        hexToRgba(colors.bg, 0.78),
        hexToRgba(colors.bg, 0.94),
        colors.bg,
      ] as const,
    [colors.bg]
  );

  const specItems = useMemo((): SpecItem[] => {
    if (!movie?.specs) return [];
    const { year, duration, ageRating, countries } = movie.specs;
    const durationLabel =
      language === 'ru'
        ? `${duration} мин`
        : language === 'en'
          ? `${duration} min`
          : `${duration} daq`;
    const items: SpecItem[] = [
      { key: 'year', label: String(year), Icon: CalendarIcon },
      { key: 'duration', label: durationLabel, Icon: ClockIcon },
      { key: 'age', label: ageRating, Icon: AgeRatingIcon },
      ...(countries ?? []).map((country, index) => ({
        key: `country-${index}-${country}`,
        label: country,
        Icon: GlobeIcon,
      })),
    ];
    return items.filter((item) => Boolean(item.label));
  }, [movie, language]);

  const genres = useMemo(() => {
    if (!movie) return [];
    return movie.genre[lang] ?? movie.genre.uz ?? [];
  }, [movie, lang]);

  const ratingItems = useMemo(() => {
    if (!movie) return [];
    const items: Array<{
      key: string;
      icon: number;
      value: string;
    }> = [];
    if (movie.ratingImdb != null) {
      items.push({
        key: 'imdb',
        icon: require('@/assets/images/imdbnew.png'),
        value: Number(movie.ratingImdb).toFixed(1),
      });
    }
    if (movie.ratingKinopoisk != null) {
      items.push({
        key: 'kp',
        icon: require('@/assets/images/kinopoisk.jpg'),
        value: Number(movie.ratingKinopoisk).toFixed(1),
      });
    }
    return items;
  }, [movie]);

  const loadMoreReplies = async (parent: MovieComment) => {
    if (loadingMoreId || !Number.isFinite(movieId)) return;
    setLoadingMoreId(parent.id);
    try {
      const skip = parent.replies?.length ?? 0;
      const result = await fetchCommentReplies(movieId, parent.id, skip, 5);
      const existing = parent.replies ?? [];
      const merged = [
        ...existing,
        ...result.replies.filter((r) => !existing.some((e) => e.id === r.id)),
      ];
      setComments((prev) =>
        prev.map((c) =>
          c.id === parent.id
            ? { ...c, replies: merged, replyCount: result.replyCount }
            : c
        )
      );
    } catch {
      // ignore
    } finally {
      setLoadingMoreId(null);
    }
  };

  const collapseReplies = (parent: MovieComment) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parent.id
          ? { ...c, replies: (c.replies ?? []).slice(0, 1) }
          : c
      )
    );
  };

  const onToggleSave = async () => {
    if (!movie || busy) return;
    if (!requireAuth('wishlist')) return;
    setBusy(true);
    try {
      await toggle(movie.id);
    } finally {
      setBusy(false);
    }
  };

  const openComments = () => {
    if (!requireAuth('comment')) return;
    setCommentsOpen(true);
  };

  const onToggleReaction = async (type: 'like' | 'dislike') => {
    if (!movie || reactionBusy) return;
    if (!requireAuth('comment')) return;
    setReactionBusy(true);
    try {
      const result = await toggleMovieReaction(movie.id, type);
      setMovie((prev) =>
        prev
          ? {
              ...prev,
              like: result.like,
              dislike: result.dislike,
              userReaction: result.userReaction,
            }
          : prev
      );
    } catch (err) {
      console.warn('Reaction failed', err);
    } finally {
      setReactionBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {!movie && !error ? (
        <View style={styles.detailBody}>
          <View
            style={[styles.posterFixed, { height: posterH }]}
            pointerEvents="none"
          >
            <SkeletonLoader
              width={width}
              height={posterH}
              borderRadius={0}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <ScrollView
            style={styles.scrollLayer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View style={{ height: posterH }} collapsable={false} />
            <View style={styles.skelSheet}>
              <SkeletonLoader
                width={Math.round(width * 0.62)}
                height={34}
                borderRadius={8}
              />
              <View style={styles.skelSpecs}>
                <SkeletonLoader width={70} height={26} borderRadius={999} />
                <SkeletonLoader width={91} height={26} borderRadius={999} />
                <SkeletonLoader width={63} height={26} borderRadius={999} />
                <SkeletonLoader width={65} height={26} borderRadius={999} />
              </View>
              <View style={styles.skelSpecs}>
                <SkeletonLoader width={61} height={26} borderRadius={999} />
                <SkeletonLoader width={61} height={26} borderRadius={999} />
                <SkeletonLoader width={71} height={26} borderRadius={999} />
                <SkeletonLoader width={71} height={26} borderRadius={999} />
                <SkeletonLoader width={78} height={26} borderRadius={999} />
              </View>
              <View style={styles.skelActions}>
                <SkeletonLoader
                  width={Math.floor((width - 42) / 2)}
                  height={44}
                  borderRadius={12}
                />
                <SkeletonLoader
                  width={Math.floor((width - 42) / 2)}
                  height={44}
                  borderRadius={12}
                />
              </View>
              <View style={styles.skelSpecs}>
                <SkeletonLoader width={82} height={32} borderRadius={999} />
                <SkeletonLoader width={58} height={32} borderRadius={999} />
                <SkeletonLoader width={58} height={32} borderRadius={999} />
              </View>
              <View style={styles.skelAbout}>
                <SkeletonLoader
                  width={Math.round(width * 0.38)}
                  height={22}
                  borderRadius={6}
                />
                <SkeletonLoader
                  width={Math.max(width - 60, 120)}
                  height={84}
                  borderRadius={8}
                />
              </View>
              <View style={styles.skelActorRow}>
                {Array.from({ length: 4 }, (_, index) => (
                  <View key={index} style={styles.skelActor}>
                    <SkeletonLoader width={72} height={72} borderRadius={36} />
                    <SkeletonLoader width={88} height={20} borderRadius={8} />
                  </View>
                ))}
              </View>
              <View style={styles.skelComments}>
                {Array.from({ length: 2 }, (_, index) => (
                  <View key={index} style={styles.skelCommentRow}>
                    <SkeletonLoader width={40} height={40} borderRadius={20} />
                    <View style={styles.skelCommentBody}>
                      <SkeletonLoader width={96} height={16} borderRadius={6} />
                      <SkeletonLoader
                        width={Math.max(width - 82, 120)}
                        height={54}
                        borderRadius={8}
                      />
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.skelSimilarRow}>
                {Array.from({ length: 3 }, (_, index) => {
                  const cardW = Math.round(width * 0.36);
                  const cardPosterH = Math.round(cardW * 1.35);
                  return (
                    <View key={index} style={{ width: cardW }}>
                      <SkeletonLoader
                        width={cardW}
                        height={cardPosterH}
                        borderRadius={14}
                      />
                      <SkeletonLoader
                        width={cardW}
                        height={22}
                        borderRadius={8}
                        style={{ marginTop: 8 }}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      ) : error || !movie ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
            {error || 'Movie not found'}
          </Text>
        </View>
      ) : (
        <View style={styles.detailBody}>
          <View
            style={[styles.posterFixed, { height: posterH }]}
            pointerEvents="none"
          >
            {poster && !posterReady ? (
              <SkeletonLoader
                width={width}
                height={posterH}
                borderRadius={0}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            {poster ? (
              <Image
                source={poster}
                style={styles.poster}
                contentFit="cover"
                contentPosition="top"
                onLoad={() => setReadyPoster(posterKey)}
                onError={() => setReadyPoster(posterKey)}
              />
            ) : (
              <View
                style={[styles.poster, { backgroundColor: colors.panelSoft }]}
              />
            )}
          </View>

          <ScrollView
            style={styles.scrollLayer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View style={{ height: posterH }} collapsable={false} />

            <View
              style={[styles.contentSheet, { backgroundColor: colors.bg }]}
            >
              <LinearGradient
                colors={[...fadeColors]}
                locations={[0, 0.18, 0.4, 0.62, 0.82, 1]}
                style={[styles.scrollFade, { height: fadeH, top: -fadeH }]}
                pointerEvents="none"
              />
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.text,
                    fontFamily: fontsLoaded ? 'Oswald_700Bold' : undefined,
                    marginTop: -Math.round(fadeH * 0.28),
                  },
                ]}
              >
                {title}
              </Text>

              <View style={styles.infoBlock}>
            {specItems.length > 0 ? (
              <HorizontalScroll contentContainerStyle={styles.specsRow}>
                {specItems.map(({ key, label, Icon }) => (
                  <View
                    key={key}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: colors.panelSoft,
                        borderColor: colors.borderSoft,
                      },
                    ]}
                  >
                    <Icon size={14} color={colors.icon} />
                    <Text style={[styles.specText, { color: colors.text }]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </HorizontalScroll>
            ) : null}

            {ratingItems.length > 0 || genres.length > 0 ? (
              <HorizontalScroll contentContainerStyle={styles.specsRow}>
                {ratingItems.map(({ key, icon, value }) => (
                  <View
                    key={key}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: colors.panelSoft,
                        borderColor: colors.borderSoft,
                      },
                    ]}
                  >
                    <Image
                      source={icon}
                      style={styles.ratingIcon}
                      contentFit="cover"
                    />
                    <Text style={[styles.specText, { color: colors.text }]}>
                      {value}
                    </Text>
                  </View>
                ))}
                {genres.map((genre) => (
                  <View
                    key={genre}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: colors.panelSoft,
                        borderColor: colors.borderSoft,
                      },
                    ]}
                  >
                    <Text style={[styles.specText, { color: colors.text }]}>
                      {genre}
                    </Text>
                  </View>
                ))}
              </HorizontalScroll>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.accentBright }]}
                onPress={() => openExternalUrl(movie.watchUrl)}
              >
                <PlayIcon size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>{t('movie.watch')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.panelSoft,
                    borderColor: colors.borderSoft,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setTrailerOpen(true)}
              >
                <VideoIcon size={16} color={colors.icon} />
                <Text style={[styles.actionBtnText, { color: colors.text }]}>
                  {t('movie.trailer')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.reactionRow}>
              <Pressable
                style={[
                  styles.reactionItem,
                  {
                    backgroundColor: colors.panelSoft,
                    borderColor: colors.borderSoft,
                  },
                ]}
                onPress={() => onToggleReaction('like')}
                disabled={reactionBusy}
              >
                <LikeIcon
                  size={18}
                  color={
                    movie.userReaction === 'like' ? LIKE_ACTIVE : colors.icon
                  }
                  filled={movie.userReaction === 'like'}
                />
                <Text
                  style={[
                    styles.reactionText,
                    {
                      color:
                        movie.userReaction === 'like'
                          ? LIKE_ACTIVE
                          : colors.text,
                    },
                  ]}
                >
                  {movie.like || '0'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.reactionItem,
                  {
                    backgroundColor: colors.panelSoft,
                    borderColor: colors.borderSoft,
                  },
                ]}
                onPress={() => onToggleReaction('dislike')}
                disabled={reactionBusy}
              >
                <DislikeIcon
                  size={18}
                  color={
                    movie.userReaction === 'dislike'
                      ? DISLIKE_ACTIVE
                      : colors.icon
                  }
                  filled={movie.userReaction === 'dislike'}
                />
                <Text
                  style={[
                    styles.reactionText,
                    {
                      color:
                        movie.userReaction === 'dislike'
                          ? DISLIKE_ACTIVE
                          : colors.text,
                    },
                  ]}
                >
                  {movie.dislike || '0'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.reactionItem,
                  {
                    backgroundColor: colors.panelSoft,
                    borderColor: colors.borderSoft,
                  },
                ]}
                onPress={openComments}
              >
                <ChatBubbleIcon size={18} color={colors.icon} />
                <Text style={[styles.reactionText, { color: colors.text }]}>
                  {movie.commentCount ?? comments.length}
                </Text>
              </Pressable>

              <View
                style={[
                  styles.reactionItem,
                  {
                    backgroundColor: colors.panelSoft,
                    borderColor: colors.borderSoft,
                  },
                ]}
              >
                <ShareIcon size={18} color={colors.icon} />
              </View>
            </View>

            {description?.text ? (
              <View style={styles.aboutSection}>
                <View
                  style={[
                    styles.aboutCard,
                    {
                      backgroundColor: colors.panelSoft,
                      borderColor: colors.borderSoft,
                    },
                  ]}
                >
                  <Text style={[styles.aboutTitle, { color: colors.text }]}>
                    {t('movie.aboutTitle')}
                  </Text>
                  <Text
                    style={[styles.aboutText, { color: colors.text }]}
                    numberOfLines={4}
                  >
                    {description.text}
                  </Text>
                  <Pressable onPress={() => setDescOpen(true)} hitSlop={6}>
                    <Text style={[styles.readMore, { color: colors.accentBright }]}>
                      {t('movie.readMore')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          {movie.actors && movie.actors.length > 0 ? (
            <View style={styles.actorsSection}>
              <Text style={[styles.actorsTitle, { color: colors.text }]}>
                {t('movie.actorsTitle')}
              </Text>
              <HorizontalScroll contentContainerStyle={styles.actorsRow}>
                {movie.actors.map((actor) => (
                  <ActorChip key={actor.id} actor={actor} />
                ))}
              </HorizontalScroll>
            </View>
          ) : null}

          <View style={styles.commentsSection}>
            <View
              style={[
                styles.commentsCard,
                {
                  backgroundColor: colors.panelSoft,
                  borderColor: colors.borderSoft,
                },
              ]}
            >
              <Text style={[styles.commentsTitle, { color: colors.text }]}>
                {t('movie.commentsTitle')}
              </Text>

              <Pressable
                style={styles.commentInputRow}
                onPress={openComments}
              >
                <View
                  style={[
                    styles.commentInputFake,
                    {
                      backgroundColor: colors.panel,
                      borderColor: colors.borderSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.commentInputPlaceholder,
                      { color: colors.textMuted },
                    ]}
                  >
                    {t('movie.commentPlaceholder')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.commentSendBtn,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <SendIcon size={16} color={colors.textOnAccent} />
                </View>
              </Pressable>

              {comments.length === 0 ? (
                <Text style={[styles.commentsEmpty, { color: colors.textMuted }]}>
                  {t('movie.noComments')}
                </Text>
              ) : (
                comments.slice(0, PREVIEW_COMMENTS).map((item) => {
                  const replies = item.replies ?? [];
                  const replyCount = item.replyCount ?? replies.length;
                  const hasMore = replies.length < replyCount;
                  const canCollapse = replies.length > 1;
                  return (
                    <PhotoGate key={item.id} picture={item.authorPicture}>
                    {(photoReady, onPhotoReady) => (
                    <View
                      style={[
                        styles.commentPreviewRow,
                        { borderTopColor: colors.borderSoft },
                      ]}
                    >
                      <UserAvatar
                        name={authorName(item)}
                        picture={item.authorPicture}
                        size={40}
                        onPhotoReady={onPhotoReady}
                      />
                      <View style={styles.commentPreviewBody}>
                        <View style={styles.commentPreviewMeta}>
                          <BlockSkeleton visible={!photoReady} borderRadius={6}>
                            <Text
                              style={[styles.commentUser, { color: colors.text }]}
                            >
                              {authorName(item)}
                            </Text>
                          </BlockSkeleton>
                          <Text
                            style={[
                              styles.commentTime,
                              { color: colors.textMuted },
                            ]}
                          >
                            {formatCommentTime(item.createdAt)}
                          </Text>
                        </View>
                        <View style={styles.previewTextBlock}>
                          <BlockSkeleton visible={!photoReady} borderRadius={8}>
                            <Text
                              style={[
                                styles.commentPreviewText,
                                { color: colors.text },
                              ]}
                              numberOfLines={3}
                            >
                              {item.text}
                            </Text>
                          </BlockSkeleton>
                          <Pressable
                            onPress={() => {
                              if (!requireAuth('comment')) return;
                              setReplyToId(item.id);
                              setCommentsOpen(true);
                            }}
                            hitSlop={6}
                            style={styles.previewReplyBtn}
                          >
                            <Text
                              style={[
                                styles.previewReply,
                                { color: colors.accentBright },
                              ]}
                            >
                              {t('movie.reply')}
                            </Text>
                          </Pressable>
                        </View>

                        {replies.length > 0 ? (
                          <View style={styles.previewReplies}>
                            {replies.map((reply) => (
                              <PhotoGate key={reply.id} picture={reply.authorPicture}>
                              {(replyReady, onReplyReady) => (
                              <View style={styles.previewReplyRow}>
                                <UserAvatar
                                  name={authorName(reply)}
                                  picture={reply.authorPicture}
                                  size={32}
                                  onPhotoReady={onReplyReady}
                                />
                                <View style={styles.previewReplyBody}>
                                  <View style={styles.previewReplyMeta}>
                                    <BlockSkeleton visible={!replyReady} borderRadius={6}>
                                      <Text
                                        style={[
                                          styles.previewReplyUser,
                                          { color: colors.text },
                                        ]}
                                      >
                                        {authorName(reply)}
                                      </Text>
                                    </BlockSkeleton>
                                    <Text
                                      style={[
                                        styles.previewReplyTime,
                                        { color: colors.textMuted },
                                      ]}
                                    >
                                      {formatCommentTime(reply.createdAt)}
                                    </Text>
                                  </View>
                                  <BlockSkeleton visible={!replyReady} borderRadius={8}>
                                    <Text
                                      style={[
                                        styles.previewReplyText,
                                        { color: colors.text },
                                      ]}
                                      numberOfLines={2}
                                    >
                                      {reply.replyToUserId ? (
                                        <>
                                          <Text
                                            style={{
                                              color: colors.accentBright,
                                              fontWeight: '700',
                                            }}
                                          >
                                            {mentionLabel(reply.replyToUserId)}{' '}
                                          </Text>
                                          {reply.text}
                                        </>
                                      ) : (
                                        reply.text
                                      )}
                                    </Text>
                                  </BlockSkeleton>
                                </View>
                              </View>
                              )}
                              </PhotoGate>
                            ))}
                            {hasMore || canCollapse ? (
                              <Pressable
                                onPress={() =>
                                  hasMore
                                    ? loadMoreReplies(item)
                                    : collapseReplies(item)
                                }
                                hitSlop={6}
                                disabled={loadingMoreId === item.id}
                                style={styles.previewMoreRepliesBtn}
                              >
                                {loadingMoreId === item.id ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={colors.accentBright}
                                  />
                                ) : (
                                  <Text
                                    style={[
                                      styles.previewMoreReplies,
                                      { color: colors.accentBright },
                                    ]}
                                  >
                                    {hasMore
                                      ? `${t('movie.moreReplies')} (${replyCount - replies.length})`
                                      : t('movie.lessReplies')}
                                  </Text>
                                )}
                              </Pressable>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </View>
                    )}
                    </PhotoGate>
                  );
                })
              )}

              {comments.length > PREVIEW_COMMENTS ? (
                <Pressable
                  onPress={openComments}
                  hitSlop={6}
                  style={styles.moreCommentsBtn}
                >
                  <Text
                    style={[styles.moreComments, { color: colors.accentBright }]}
                  >
                    {`${t('movie.moreComments')} (${Math.max(
                      0,
                      (movie?.commentCount ?? comments.length) - PREVIEW_COMMENTS
                    )})`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {similarMovies.length > 0 ? (
            <View style={styles.similarSection}>
              <Text style={[styles.similarTitle, { color: colors.text }]}>
                {t('movie.similarMovies')}
              </Text>
              <HorizontalScroll contentContainerStyle={styles.similarRow}>
                {similarMovies.map((item) => (
                  <SimilarMovieCard
                    key={item.id}
                    movie={item}
                    language={language}
                    width={Math.round(width * 0.36)}
                  />
                ))}
              </HorizontalScroll>
            </View>
          ) : null}
          </View>
          </ScrollView>
        </View>
      )}

      <MovieDescriptionModal
        visible={descOpen}
        onClose={() => setDescOpen(false)}
        description={description}
        durationLabel={durationLabel}
      />

      <TrailerModal
        visible={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        movieId={movie?.id}
        trailerUrl={movie?.trailers}
        watchUrl={movie?.watchUrl}
        movieTitle={title}
        description={description}
        durationLabel={durationLabel}
      />

      <CommentModal
        visible={commentsOpen}
        onClose={() => {
          setCommentsOpen(false);
          setReplyToId(null);
        }}
        movieId={movieId}
        comments={comments}
        replyToId={replyToId}
        onReplyToIdConsumed={() => setReplyToId(null)}
        onCommentsChange={(nextComments, commentCount) => {
          setComments(nextComments);
          if (commentCount != null) {
            setMovie((prev) => (prev ? { ...prev, commentCount } : prev));
          }
        }}
      />

      <View
        style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[
            styles.circleBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
          ]}
          onPress={() => router.back()}
        >
          <ChevronLeftIcon size={20} color={colors.icon} />
        </Pressable>

        {movie ? (
          <Pressable
            style={[
              styles.circleBtn,
              { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
            ]}
            onPress={onToggleSave}
            disabled={busy}
          >
            <BookmarkIcon
              size={18}
              color={isSaved ? SAVE_ACTIVE : colors.icon}
              filled={isSaved}
            />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  posterFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  scrollLayer: {
    flex: 1,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  detailBody: {
    flex: 1,
  },
  skelSheet: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 22,
  },
  skelAbout: {
    gap: 8,
  },
  skelSpecs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skelActions: {
    flexDirection: 'row',
    gap: 10,
  },
  skelActorRow: {
    flexDirection: 'row',
    gap: 14,
  },
  skelActor: {
    width: 88,
    alignItems: 'center',
    gap: 8,
  },
  skelComments: {
    gap: 12,
  },
  skelCommentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  skelCommentBody: {
    flex: 1,
    gap: 6,
  },
  skelSimilarRow: {
    flexDirection: 'row',
    gap: 12,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  contentSheet: {
    position: 'relative',
    paddingTop: 4,
  },
  scrollFade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  title: {
    paddingHorizontal: 16,
    marginBottom: 6,
    zIndex: 2,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 1,
    transform: [{ skewX: '-14deg' }],
  },
  infoBlock: {
    gap: 8,
    paddingTop: 10,
  },
  specsRow: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  specText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  ratingIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  actionRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  reactionRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  reactionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  aboutSection: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  aboutTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  aboutCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
  readMore: {
    fontSize: 14,
    fontWeight: '700',
  },
  actorsSection: {
    paddingTop: 12,
    gap: 10,
  },
  actorsTitle: {
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '700',
  },
  actorsRow: {
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  similarSection: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  similarTitle: {
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '700',
  },
  similarRow: {
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  commentsCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentInputFake: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  commentInputPlaceholder: {
    fontSize: 15,
    fontWeight: '400',
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsEmpty: {
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 4,
  },
  commentPreviewRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  commentPreviewBody: {
    flex: 1,
    gap: 3,
  },
  commentPreviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  commentPreviewText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  previewTextBlock: {
    gap: 2,
    width: '100%',
  },
  previewReplyBtn: {
    alignSelf: 'flex-start',
    marginTop: 0,
  },
  previewReply: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  previewReplies: {
    marginTop: 4,
    gap: 4,
    width: '100%',
  },
  previewReplyRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  previewReplyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  previewReplyBody: {
    flex: 1,
    gap: 2,
  },
  previewReplyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewReplyUser: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewReplyTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  previewReplyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
  previewMoreRepliesBtn: {
    alignSelf: 'center',
    marginTop: 2,
    minHeight: 18,
    justifyContent: 'center',
  },
  previewMoreReplies: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  moreCommentsBtn: {
    paddingTop: 2,
  },
  moreComments: {
    fontSize: 14,
    fontWeight: '700',
  },
});
