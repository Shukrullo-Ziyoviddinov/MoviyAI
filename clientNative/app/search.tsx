import { CameraIcon, ChevronLeftIcon } from '@/components/icons';
import { searchMovies, type MovieSearchResult } from '@/src/api/movies';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { resolveMoviePoster } from '@/src/utils/moviePosters';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEBOUNCE_MS = 280;

export default function SearchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const lang = language === 'en' ? 'uz' : language;
  const inputRef = useRef<TextInput>(null);
  const requestId = useRef(0);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      requestId.current += 1;
      setResults([]);
      setLoading(false);
      setError(false);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(false);
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchMovies(q);
          if (id !== requestId.current) return;
          setResults(rows);
          setSearched(true);
        } catch {
          if (id !== requestId.current) return;
          setResults([]);
          setError(true);
          setSearched(true);
        } finally {
          if (id === requestId.current) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: colors.borderSoft,
          },
        ]}
      >
        <Pressable
          style={[
            styles.backBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
          ]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ChevronLeftIcon size={22} color={colors.icon} />
        </Pressable>

        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.panelSoft,
              borderColor: colors.borderSoft,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          <Pressable
            style={styles.cameraBtn}
            onPress={() => {
              // Keyinroq: surat orqali qidiruv
            }}
            hitSlop={8}
          >
            <CameraIcon size={28} color={colors.icon} strokeWidth={2.15} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.icon} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            {t('search.error')}
          </Text>
        </View>
      ) : !query.trim() ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            {t('search.hint')}
          </Text>
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            {t('search.empty')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const title = item.title[lang] ?? item.title.uz;
            const poster = resolveMoviePoster(item.homeImgPoster);
            const meta = [item.year || null, item.ratingImdb ? `IMDb ${item.ratingImdb}` : null]
              .filter(Boolean)
              .join(' · ');

            return (
              <Pressable
                style={[
                  styles.row,
                  { borderBottomColor: colors.borderSoft },
                ]}
                onPress={() => router.push(`/movie/${item.id}`)}
              >
                <View
                  style={[
                    styles.posterWrap,
                    { backgroundColor: colors.panelSoft },
                  ]}
                >
                  {poster ? (
                    <Image
                      source={poster}
                      style={styles.poster}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
                <View style={styles.rowText}>
                  <Text
                    style={[styles.title, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {title}
                  </Text>
                  {meta ? (
                    <Text
                      style={[styles.meta, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {meta}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inputWrap: {
    flex: 1,
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 10,
    paddingRight: 8,
  },
  cameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  posterWrap: {
    width: 48,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
