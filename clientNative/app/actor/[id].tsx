import { ChevronLeftIcon } from '@/components/icons';
import { ActorInfoModal } from '@/components/actor/ActorInfoModal';
import { MovieCategoryRow } from '@/components/movie/MovieCategoryRow';
import { fetchActorById } from '@/src/api/actors';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import type { Actor } from '@/src/types/actor';
import { resolveActorImage } from '@/src/utils/actorImages';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ActorPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const actorId = Number(id);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const language = useLanguageStore((s) => s.language);
  const lang = language === 'en' ? 'uz' : language;
  const cardWidth = Math.round(width * 0.39);

  const [actor, setActor] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!Number.isFinite(actorId)) {
      setError('Invalid actor id');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchActorById(actorId)
      .then((doc) => {
        if (!alive) return;
        setActor(doc);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Load failed');
        setActor(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [actorId]);

  const aboutText = actor
    ? actor.actorAbout[lang] ?? actor.actorAbout.uz
    : '';
  const photo = actor ? resolveActorImage(actor.actorImg) : null;
  const movies = actor?.movies ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View
        style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[
            styles.circleBtn,
            {
              backgroundColor: colors.panelSoft,
              borderColor: colors.borderSoft,
            },
          ]}
          onPress={() => router.back()}
        >
          <ChevronLeftIcon size={20} color={colors.icon} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentBright} />
        </View>
      ) : error || !actor ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>
            {error || t('actor.notFound')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroRow}>
            <View
              style={[
                styles.photoWrap,
                {
                  backgroundColor: colors.panelSoft,
                  borderColor: colors.borderSoft,
                },
              ]}
            >
              {photo ? (
                <Image
                  source={photo}
                  style={styles.photo}
                  contentFit="cover"
                />
              ) : null}
            </View>

            <View style={styles.infoCol}>
              <Text style={[styles.name, { color: colors.text }]}>
                {actor.actorName}
              </Text>
              <Text
                style={[styles.aboutPreview, { color: colors.text }]}
                numberOfLines={2}
              >
                {aboutText}
              </Text>
              {aboutText ? (
                <Pressable onPress={() => setInfoOpen(true)} hitSlop={6}>
                  <Text
                    style={[styles.readMore, { color: colors.accentBright }]}
                  >
                    {t('actor.readMore')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {movies.length > 0 ? (
            <View style={styles.moviesBlock}>
              <MovieCategoryRow
                title={t('actor.moviesTitle')}
                movies={movies}
                language={language}
                cardWidth={cardWidth}
                contentPad={0}
              />
            </View>
          ) : null}
        </ScrollView>
      )}

      <ActorInfoModal
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
        actor={actor}
        aboutText={aboutText}
      />
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
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  photoWrap: {
    width: 110,
    height: 148,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
    gap: 8,
    paddingTop: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  aboutPreview: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  readMore: {
    fontSize: 14,
    fontWeight: '700',
  },
  moviesBlock: {
    marginTop: 22,
  },
});
