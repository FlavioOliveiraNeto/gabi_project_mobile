import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ConfirmModal from '@/components/dashboard/confirm-modal';
import { TapRow, apiErrorMessage, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { transcribeAudio } from '@/services/dashboard';

// ponytail: teto de gravação — uma gravação esquecida vira upload gigante e timeout
const MAX_SECONDS = 5 * 60;
const WARN_SECONDS = 30;
// acima disso, descartar pede confirmação: já há fala suficiente para doer
const CONFIRM_OVER_SECONDS = 5;
// espera até avisar que o envio está demorando
const SLOW_UPLOAD_SECONDS = 8;
// silêncio contínuo até avisar que nada está sendo captado
const SILENCE_SECONDS = 3;

// metering alimenta o poço do microfone; o preset sozinho não o liga
const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

// dBFS de voz útil vive entre -50 e -5; abaixo do piso é silêncio
const DB_FLOOR = -50;
const DB_CEIL = -5;

type Mode = 'idle' | 'recording' | 'transcribing';

function clock(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/**
 * O poço do microfone é o único objeto animado do componente e atravessa as fases
 * sem desmontar: pulsa com a voz enquanto grava, gira enquanto transcreve, repousa
 * no resto do tempo. A continuidade é o efeito.
 *
 * O anel só se move com dB real — sem medição ele fica parado, porque uma animação
 * que simula escuta é mentira num aparelho com o microfone bloqueado.
 */
function MicWell({
  mode,
  level,
  reduceMotion,
}: {
  mode: Mode;
  level: Animated.Value;
  reduceMotion: boolean;
}) {
  const recording = mode === 'recording';
  const transcribing = mode === 'transcribing';
  const size = recording ? 44 : transcribing ? 40 : 28;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!transcribing || reduceMotion) return;
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [transcribing, reduceMotion, spin]);

  const iconColor = recording ? C.recording : C.primary;
  const wellColor = recording ? C.recordingSurface : C.primarySurface;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {recording ? (
        <Animated.View
          pointerEvents="none"
          style={[
            st.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: C.recording,
              opacity: level.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }),
              transform: [
                { scale: level.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.5] }) },
              ],
            },
          ]}
        />
      ) : null}

      {transcribing && !reduceMotion ? (
        <Animated.View
          pointerEvents="none"
          style={[
            st.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: C.primary,
              borderTopColor: 'transparent',
              transform: [
                {
                  rotate: spin.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          st.wellCore,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: wellColor,
            transform: [{ scale: level.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
          },
        ]}>
        {transcribing && reduceMotion ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : (
          <Ionicons name="mic-outline" size={recording ? 20 : 16} color={iconColor} />
        )}
      </Animated.View>
    </View>
  );
}

export default function DictateButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const [mode, setMode] = useState<Mode>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [uploadSeconds, setUploadSeconds] = useState(0);
  const [metered, setMetered] = useState(true);
  const [silent, setSilent] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failure, setFailure] = useState('');
  // áudio guardado depois de uma falha: existe um envio para repetir
  const [retained, setRetained] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const level = useRef(new Animated.Value(0)).current;
  const pendingUri = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const announced = useRef(0);

  const recording = mode === 'recording';

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // ponytail: sair da tela no meio da gravação não pode deixar o microfone aberto
  useEffect(
    () => () => {
      abortRef.current?.abort();
      recorder.stop().catch(() => {});
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {});
    },
    [recorder],
  );

  const release = useCallback(
    () => setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {}),
    [],
  );

  const upload = useCallback(
    async (uri: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setUploadSeconds(0);
      setMode('transcribing');

      try {
        const text = await transcribeAudio(uri, controller.signal);
        if (!alive.current) return;

        if (text.trim()) {
          pendingUri.current = null;
          setRetained(false);
          setMode('idle');
          onTranscript(text.trim());
          AccessibilityInfo.announceForAccessibility('Transcrição inserida na anotação.');
        } else {
          setFailure('Não entendi o áudio. Tente enviar de novo ou grave outra vez.');
          setRetained(Boolean(pendingUri.current));
          setMode('idle');
        }
      } catch (err) {
        if (!alive.current) return;
        setFailure(
          controller.signal.aborted
            ? 'Envio cancelado. O áudio continua aqui.'
            : apiErrorMessage(err, 'Não foi possível transcrever o áudio.'),
        );
        setRetained(Boolean(pendingUri.current));
        setMode('idle');
        AccessibilityInfo.announceForAccessibility('Falha ao enviar o áudio. O áudio foi mantido.');
      } finally {
        abortRef.current = null;
      }
    },
    [onTranscript],
  );

  const stop = useCallback(async () => {
    setMode('transcribing');
    try {
      await recorder.stop();
    } catch {
      // o arquivo ainda pode existir; a URI abaixo decide
    }
    await release();

    const uri = recorder.uri;
    if (!uri) {
      setFailure('A gravação não foi salva pelo aparelho. Grave novamente.');
      setRetained(false);
      setMode('idle');
      return;
    }

    pendingUri.current = uri;
    await upload(uri);
  }, [recorder, release, upload]);

  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const discard = useCallback(
    async (announce = true) => {
      abortRef.current?.abort();
      pendingUri.current = null;
      setRetained(false);
      setFailure('');
      setMode('idle');
      try {
        await recorder.stop();
      } catch {
        // já parado
      }
      await release();
      if (announce) AccessibilityInfo.announceForAccessibility('Gravação descartada.');
    },
    [recorder, release],
  );

  // relógio da gravação, com aviso falado nos marcos e no corte iminente
  useEffect(() => {
    if (!recording) return;
    setElapsed(0);
    announced.current = 0;
    const id = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (!recording || elapsed === 0) return;

    if (elapsed >= MAX_SECONDS) {
      AccessibilityInfo.announceForAccessibility('Tempo máximo atingido. Enviando o áudio.');
      void stopRef.current();
      return;
    }

    const left = MAX_SECONDS - elapsed;
    if (left === WARN_SECONDS) {
      AccessibilityInfo.announceForAccessibility('Trinta segundos para o fim da gravação.');
    } else if (elapsed % 60 === 0 && elapsed !== announced.current) {
      announced.current = elapsed;
      AccessibilityInfo.announceForAccessibility(`${elapsed / 60} minuto${elapsed > 60 ? 's' : ''} de gravação.`);
    }
  }, [recording, elapsed]);

  // relógio do envio: só aparece quando a espera passa do razoável
  useEffect(() => {
    if (mode !== 'transcribing') return;
    const id = setInterval(() => setUploadSeconds((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [mode]);

  // amplitude real do microfone; sem ela o anel fica parado e a tela diz por quê
  useEffect(() => {
    if (!recording || !metered) {
      Animated.timing(level, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      return;
    }

    let quietTicks = 0;
    const id = setInterval(() => {
      const db = recorder.getStatus().metering;
      if (db === undefined) {
        setMetered(false);
        return;
      }

      quietTicks = db <= DB_FLOOR ? quietTicks + 1 : 0;
      setSilent(quietTicks >= SILENCE_SECONDS * 10);

      const raw = (db - DB_FLOOR) / (DB_CEIL - DB_FLOOR);
      // curva compressiva: numa sala silenciosa o linear vive colado no piso
      const next = Math.sqrt(Math.min(1, Math.max(0, raw)));
      Animated.spring(level, {
        toValue: reduceMotion ? 0 : next,
        speed: 20,
        bounciness: 6,
        useNativeDriver: true,
      }).start();
    }, 100);

    return () => clearInterval(id);
  }, [recorder, recording, metered, reduceMotion, level]);

  async function start() {
    setFailure('');
    setRetained(false);
    pendingUri.current = null;
    setSilent(false);
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      setFailure('Permita o acesso ao microfone para gravar a anotação.');
      return;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setMode('recording');
    AccessibilityInfo.announceForAccessibility('Gravando a anotação.');
  }

  function requestStop() {
    void stopRef.current();
  }

  function requestDiscard() {
    if (elapsed >= CONFIRM_OVER_SECONDS) setConfirmDiscard(true);
    else void discard();
  }

  const left = Math.max(0, MAX_SECONDS - elapsed);
  const ending = recording && left <= WARN_SECONDS;
  const slow = mode === 'transcribing' && uploadSeconds >= SLOW_UPLOAD_SECONDS;

  return (
    <View
      accessibilityLiveRegion={mode === 'idle' ? 'none' : 'polite'}
      style={[mode !== 'idle' && st.panel, recording && st.recordingPanel]}>
      <Pressable
        accessibilityRole={mode === 'idle' ? 'button' : undefined}
        accessibilityLabel={mode === 'idle' ? 'Ditar a anotação por voz' : undefined}
        accessibilityState={{ disabled: mode === 'idle' && Boolean(disabled) }}
        disabled={mode !== 'idle' || disabled}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        onPress={() =>
          void start().catch(() => setFailure('Não foi possível iniciar a gravação.'))
        }
        style={[s.row, { gap: 10, opacity: mode === 'idle' && disabled ? 0.5 : 1 }]}>
        <MicWell mode={mode} level={level} reduceMotion={reduceMotion} />

        <View style={{ flex: 1, minWidth: 0 }}>
          {recording ? (
            <>
              <Text style={[st.eyebrow, { color: C.amberInk }]}>GRAVANDO</Text>
              <Text style={[st.timer, ending && { color: C.destructive }]}>{clock(elapsed)}</Text>
            </>
          ) : mode === 'transcribing' ? (
            <>
              <Text style={[st.eyebrow, { color: C.mutedForeground }]}>TRANSCREVENDO</Text>
              <Text style={[s.muted, { fontSize: 13 }]}>
                {slow
                  ? `Ainda enviando, ${clock(uploadSeconds)}. A conexão pode estar lenta.`
                  : 'Convertendo o áudio em texto. Pode levar alguns segundos.'}
              </Text>
            </>
          ) : (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: disabled ? C.mutedForeground : C.primary,
              }}>
              Ditar anotação
            </Text>
          )}
        </View>

        {recording ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Parar a gravação e transcrever"
            hitSlop={10}
            onPress={requestStop}
            style={({ pressed }) => [s.row, st.primaryAction, pressed && { opacity: 0.7 }]}>
            <Ionicons name="stop" size={12} color={C.primaryForeground} />
            <Text style={st.primaryLabel}>Parar</Text>
          </Pressable>
        ) : null}

        {mode === 'idle' && retained ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tentar enviar o áudio gravado novamente"
            hitSlop={10}
            onPress={() => {
              const uri = pendingUri.current;
              if (uri) void upload(uri);
            }}
            style={({ pressed }) => [s.row, st.primaryAction, pressed && { opacity: 0.7 }]}>
            <Ionicons name="refresh" size={12} color={C.primaryForeground} />
            <Text style={st.primaryLabel}>Tentar de novo</Text>
          </Pressable>
        ) : null}
      </Pressable>

      {mode === 'idle' ? (
        <>
          <Text style={[s.muted, { fontSize: 12, marginTop: 2 }]}>
            O áudio é enviado ao servidor para transcrição.
          </Text>

          {failure ? (
            <View
              accessibilityLiveRegion="polite"
              style={[s.row, { gap: 6, marginTop: 6, alignItems: 'flex-start' }]}>
              <Ionicons name="alert-circle-outline" size={14} color={C.destructive} />
              <Text style={{ fontSize: 12, color: C.destructive, flex: 1 }}>{failure}</Text>
            </View>
          ) : null}

          {retained ? (
            <TapRow
              label="Descartar o áudio gravado"
              onPress={() => void discard()}
              style={st.secondary}>
              <Ionicons name="trash-outline" size={14} color={C.mutedForeground} />
              <Text style={st.secondaryLabel}>Descartar áudio</Text>
            </TapRow>
          ) : null}
        </>
      ) : null}

      {recording ? (
        <>
          <TapRow label="Descartar a gravação" onPress={requestDiscard} style={st.secondary}>
            <Ionicons name="trash-outline" size={14} color={C.mutedForeground} />
            <Text style={st.secondaryLabel}>Descartar</Text>
          </TapRow>

          {!metered ? (
            <Text style={[s.muted, { fontSize: 12, marginTop: 6 }]}>
              Sem medição de áudio neste aparelho — confie no cronômetro.
            </Text>
          ) : silent ? (
            <Text style={{ fontSize: 12, color: C.destructive, marginTop: 6 }}>
              Não estou captando som. Verifique o microfone.
            </Text>
          ) : null}

          {ending ? (
            <Text style={{ fontSize: 12, color: C.destructive, marginTop: 6 }}>
              A gravação para sozinha em {left}s.
            </Text>
          ) : null}

        </>
      ) : null}

      {mode === 'transcribing' && slow ? (
        <TapRow
          label="Cancelar o envio do áudio"
          onPress={() => abortRef.current?.abort()}
          style={st.secondary}>
          <Ionicons name="close" size={14} color={C.mutedForeground} />
          <Text style={st.secondaryLabel}>Cancelar envio</Text>
        </TapRow>
      ) : null}

      <ConfirmModal
        visible={confirmDiscard}
        title="Descartar a gravação?"
        message={`Você gravou ${clock(elapsed)}. O áudio não pode ser recuperado depois.`}
        confirmLabel="Descartar"
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => discard()}
      />
    </View>
  );
}

const st = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.card,
    padding: 14,
  },
  recordingPanel: { borderColor: C.recordingBorder, backgroundColor: C.recordingPanel },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  timer: { fontSize: 26, color: C.recording, fontVariant: ['tabular-nums'] },
  ring: { position: 'absolute', borderWidth: 2 },
  wellCore: { alignItems: 'center', justifyContent: 'center' },
  primaryAction: {
    gap: 5,
    alignSelf: 'center',
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  primaryLabel: { fontSize: 13, fontWeight: '600', color: C.primaryForeground },
  secondary: { gap: 5, alignSelf: 'flex-end', marginTop: 6 },
  secondaryLabel: { fontSize: 13, fontWeight: '600', color: C.mutedForeground },
});
