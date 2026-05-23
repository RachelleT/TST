/**
 * Quiz tab — all three phases (entry, session, summary) in one screen.
 *
 * Phase machine:
 *   'entry'   → user sees word count and "Start" button
 *   'loading' → generating session (async)
 *   'session' → one question at a time, with feedback state
 *   'summary' → score + missed words, "Done" resets to 'entry'
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useTheme } from '@/lib/hooks/useTheme';
import { useAuthStore } from '@/lib/stores/auth';
import { t } from '@/lib/i18n';

import { generateSession, recordAnswer as dbRecordAnswer } from '@/features/quiz/engine';
import { getSavedWordCount, QUIZ_MIN_WORDS } from '@/features/quiz/selectors';
import { matchAnswer } from '@/features/quiz/synonym-matcher';
import {
  QuizQuestion,
  MCQuestion,
  FillInQuestion,
  RecordedAnswer,
  AnswerResult,
} from '@/features/quiz/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'entry' | 'loading' | 'session' | 'summary';

const SESSION_LENGTHS = [5, 10, 15, 20] as const;
type SessionLength = (typeof SESSION_LENGTHS)[number];

// ─── Entry screen ─────────────────────────────────────────────────────────────

function EntryScreen({
  wordCount,
  sessionLength,
  onChangeLength,
  onStart,
  loading,
}: {
  wordCount: number;
  sessionLength: SessionLength;
  onChangeLength: (n: SessionLength) => void;
  onStart: () => void;
  loading: boolean;
}) {
  const { colors } = useTheme();
  const hasEnough = wordCount >= QUIZ_MIN_WORDS;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.entryContent} keyboardShouldPersistTaps="handled">
        <AppText variant="title" color={colors.text.primary} style={styles.entryTitle}>
          {t('Ready for a quiz?')}
        </AppText>

        {hasEnough ? (
          <>
            <AppText variant="body" color={colors.text.secondary} style={styles.entrySubtitle}>
              {t(`You have ${wordCount} word${wordCount !== 1 ? 's' : ''} to practise.`)}
            </AppText>

            {/* Session length picker */}
            <View style={styles.lengthSection}>
              <AppText variant="bodyMedium" color={colors.text.secondary} style={styles.lengthLabel}>
                {t('Questions')}
              </AppText>
              <View style={styles.lengthRow}>
                {SESSION_LENGTHS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.lengthChip,
                      {
                        backgroundColor:
                          sessionLength === n ? colors.accent.primary : colors.surface.elevated,
                        borderColor:
                          sessionLength === n ? colors.accent.primary : colors.border.subtle,
                      },
                    ]}
                    onPress={() => onChangeLength(n)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sessionLength === n }}
                    accessibilityLabel={`${n} questions`}
                  >
                    <AppText
                      variant="bodyMedium"
                      color={sessionLength === n ? colors.surface.page : colors.text.primary}
                    >
                      {String(n)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              label={loading ? t('Preparing…') : t('Start quiz')}
              onPress={onStart}
              loading={loading}
              style={styles.startButton}
            />
          </>
        ) : (
          <>
            <AppText variant="body" color={colors.text.secondary} style={styles.entrySubtitle}>
              {t(`Save at least ${QUIZ_MIN_WORDS} words to start a quiz.`)}
            </AppText>
            <AppText variant="body" color={colors.text.tertiary} style={{ textAlign: 'center' }}>
              {t(`You have ${wordCount} saved so far.`)}
            </AppText>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  current,
  total,
  color,
}: {
  current: number;
  total: number;
  color: string;
}) {
  const { colors } = useTheme();
  const pct = total > 0 ? current / total : 0;
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.border.subtle }]}>
      <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── Multiple-choice question ─────────────────────────────────────────────────

function MCQuestionView({
  question,
  answered,
  selectedOption,
  onSelect,
}: {
  question: MCQuestion;
  answered: boolean;
  selectedOption: string | null;
  onSelect: (option: string) => void;
}) {
  const { colors } = useTheme();
  const isDefToWord =
    question.format === 'def_to_word' || question.format === 'word_for_description';

  return (
    <View style={styles.questionBody}>
      {/* Format label */}
      <AppText variant="caption" color={colors.text.tertiary} style={styles.formatLabel}>
        {formatLabel(question.format)}
      </AppText>

      {/* Prompt */}
      <View
        style={[
          styles.promptBox,
          {
            backgroundColor: colors.surface.elevated,
            borderColor: colors.border.subtle,
          },
        ]}
      >
        <AppText
          variant={isDefToWord ? 'body' : 'title'}
          color={colors.text.primary}
          style={isDefToWord ? styles.promptDef : styles.promptWord}
        >
          {question.prompt}
        </AppText>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option) => {
          const isSelected = selectedOption === option;
          const isCorrect = option === question.correctOption;
          const optionState = getOptionState(answered, isSelected, isCorrect);

          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                {
                  backgroundColor: optionBg(optionState, colors),
                  borderColor: optionBorder(optionState, colors),
                },
              ]}
              onPress={() => !answered && onSelect(option)}
              disabled={answered}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: answered }}
            >
              <AppText
                variant="body"
                color={optionTextColor(optionState, colors)}
                style={styles.optionText}
              >
                {option}
              </AppText>
              {answered && isCorrect && (
                <AppText style={styles.optionTick} color="#22c55e">
                  ✓
                </AppText>
              )}
              {answered && isSelected && !isCorrect && (
                <AppText style={styles.optionTick} color="#ef4444">
                  ✗
                </AppText>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Fill-in question ─────────────────────────────────────────────────────────

function FillInQuestionView({
  question,
  answered,
  result,
  userInput,
  onChangeInput,
  onSubmit,
}: {
  question: FillInQuestion;
  answered: boolean;
  result: AnswerResult | null;
  userInput: string;
  onChangeInput: (text: string) => void;
  onSubmit: () => void;
}) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const wordLength = question.correctAnswer.length;
  // Allow extra chars so synonyms longer than the target can still be typed
  const maxLength = Math.max(wordLength, 20);

  return (
    <View style={styles.questionBody}>
      <AppText variant="caption" color={colors.text.tertiary} style={styles.formatLabel}>
        {t('Fill in the blank')}
      </AppText>

      <View
        style={[
          styles.promptBox,
          {
            backgroundColor: colors.surface.elevated,
            borderColor: colors.border.subtle,
          },
        ]}
      >
        <AppText variant="body" color={colors.text.primary} style={styles.promptDef}>
          {question.prompt}
        </AppText>
      </View>

      {/* Letter boxes — tap anywhere to focus the hidden input */}
      <Pressable
        onPress={() => !answered && inputRef.current?.focus()}
        style={styles.letterBoxRow}
        accessibilityLabel={t('Letter input boxes — tap to type')}
      >
        {question.correctAnswer.split('').map((_, i) => {
          // After answering: always reveal the correct word in green.
          // Before answering: show what the user has typed so far.
          const displayChar = answered ? question.correctAnswer[i] : (userInput[i] ?? '');
          const isActive = !answered && i === Math.min(userInput.length, wordLength - 1);

          let borderColor = colors.border.subtle;
          if (answered) {
            borderColor = '#16a34a';
          } else if (isActive && !displayChar) {
            borderColor = colors.accent.primary; // cursor position indicator
          } else if (displayChar) {
            borderColor = colors.accent.muted;
          }

          return (
            <View
              key={i}
              style={[
                styles.letterBox,
                { borderColor, backgroundColor: colors.surface.card },
              ]}
            >
              <Text
                style={[
                  styles.letterBoxText,
                  { color: answered ? '#16a34a' : colors.text.primary },
                ]}
              >
                {displayChar ? displayChar.toUpperCase() : ''}
              </Text>
            </View>
          );
        })}
      </Pressable>

      {/* Hidden input — captures keyboard events */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={userInput}
        onChangeText={!answered ? onChangeInput : undefined}
        onSubmitEditing={onSubmit}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        editable={!answered}
        returnKeyType="done"
        maxLength={maxLength}
        caretHidden
      />

      {!answered && (
        <Button
          label={t('Check')}
          onPress={onSubmit}
          disabled={userInput.trim().length === 0}
          style={styles.checkButton}
        />
      )}
    </View>
  );
}

// ─── Session screen ───────────────────────────────────────────────────────────

function SessionScreen({
  questions,
  currentIndex,
  onAnswer,
  onContinue,
  onQuit,
}: {
  questions: QuizQuestion[];
  currentIndex: number;
  onAnswer: (result: AnswerResult, userAnswer: string) => void;
  onContinue: () => void;
  onQuit: () => void;
}) {
  const { colors } = useTheme();
  const question = questions[currentIndex];

  // Answer state for current question
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<AnswerResult | null>(null);

  // Reset when index changes
  useEffect(() => {
    setSelectedOption(null);
    setUserInput('');
    setAnswered(false);
    setFeedbackResult(null);
  }, [currentIndex]);

  function handleMCSelect(option: string) {
    if (answered) return;
    setSelectedOption(option);
    const isCorrect = option === (question as MCQuestion).correctOption;
    const result: AnswerResult = isCorrect ? 'correct' : 'incorrect';
    setFeedbackResult(result);
    setAnswered(true);
    onAnswer(result, option);
  }

  function handleFillSubmit() {
    const input = userInput.trim();
    if (!input || answered) return;
    const q = question as FillInQuestion;
    const matchResult = matchAnswer(input, q.correctAnswer, q.word.synonyms);

    let result: AnswerResult;
    if (!matchResult.matched) {
      result = 'incorrect';
    } else if (matchResult.matchedAs === 'synonym') {
      result = 'synonym_accepted';
    } else {
      result = 'correct';
    }

    setFeedbackResult(result);
    setAnswered(true);
    onAnswer(result, input);
  }

  const isFillIn = question.format === 'fill_in_sentence';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.sessionContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header row */}
          <View style={styles.sessionHeader}>
            <TouchableOpacity onPress={onQuit} accessibilityLabel={t('Quit quiz')}>
              <AppText variant="body" color={colors.text.tertiary}>
                {t('Quit')}
              </AppText>
            </TouchableOpacity>
            <AppText variant="bodyMedium" color={colors.text.secondary}>
              {`${currentIndex + 1} / ${questions.length}`}
            </AppText>
          </View>

          {/* Progress bar */}
          <ProgressBar
            current={currentIndex}
            total={questions.length}
            color={colors.accent.primary}
          />

          {/* Question */}
          {isFillIn ? (
            <FillInQuestionView
              question={question as FillInQuestion}
              answered={answered}
              result={feedbackResult}
              userInput={userInput}
              onChangeInput={setUserInput}
              onSubmit={handleFillSubmit}
            />
          ) : (
            <MCQuestionView
              question={question as MCQuestion}
              answered={answered}
              selectedOption={selectedOption}
              onSelect={handleMCSelect}
            />
          )}

          {/* Continue — appears once the question is answered */}
          {answered && (
            <Button
              label={
                currentIndex < questions.length - 1 ? t('Continue') : t('See results')
              }
              onPress={onContinue}
              style={styles.continueButton}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Summary screen ───────────────────────────────────────────────────────────

function SummaryScreen({
  answers,
  questions,
  onDone,
}: {
  answers: RecordedAnswer[];
  questions: QuizQuestion[];
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const correct = answers.filter(
    (a) => a.result === 'correct' || a.result === 'synonym_accepted',
  ).length;
  const total = answers.length;
  const missed = answers
    .filter((a) => a.result === 'incorrect')
    .map((a) => {
      const q = questions.find((q) => q.word.id === a.wordId);
      return q?.word.word ?? '—';
    });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.summaryContent}>
        <AppText variant="title" color={colors.text.primary} style={styles.summaryTitle}>
          {t('Done.')}
        </AppText>

        {/* Score */}
        <View
          style={[
            styles.scoreCard,
            { backgroundColor: colors.surface.card, borderColor: colors.border.subtle },
          ]}
        >
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: colors.accent.primary }]}>
              {correct}
            </Text>
            <Text style={[styles.scoreDenom, { color: colors.text.secondary }]}>
              {` / ${total}`}
            </Text>
          </View>
          <AppText variant="body" color={colors.text.secondary}>
            {correct === total
              ? t('Perfect round.')
              : correct >= total * 0.8
                ? t('Nice work.')
                : correct >= total * 0.5
                  ? t('Getting there.')
                  : t('Keep practising.')}
          </AppText>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdownRow}>
          <StatBox label={t('Correct')} value={correct} color="#16a34a" colors={colors} />
          <StatBox
            label={t('Incorrect')}
            value={total - correct}
            color="#dc2626"
            colors={colors}
          />
        </View>

        {/* Missed words */}
        {missed.length > 0 && (
          <View style={styles.missedSection}>
            <AppText
              variant="bodyMedium"
              color={colors.text.secondary}
              style={styles.missedHeading}
            >
              {t('Words to review')}
            </AppText>
            {missed.map((word, i) => (
              <View
                key={i}
                style={[
                  styles.missedRow,
                  { borderBottomColor: colors.border.subtle },
                ]}
              >
                <AppText variant="body" color={colors.text.primary}>
                  {word}
                </AppText>
              </View>
            ))}
          </View>
        )}

        <Button label={t('Done')} onPress={onDone} style={styles.doneButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: number;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View
      style={[
        styles.statBox,
        { backgroundColor: colors.surface.card, borderColor: colors.border.subtle },
      ]}
    >
      <AppText variant="title" color={color} style={styles.statNum}>
        {String(value)}
      </AppText>
      <AppText variant="caption" color={colors.text.secondary}>
        {label}
      </AppText>
    </View>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function QuizIndex() {
  const { colors } = useTheme();
  const { session } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('entry');
  const [wordCount, setWordCount] = useState(0);
  const [sessionLength, setSessionLength] = useState<SessionLength>(10);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<RecordedAnswer[]>([]);

  const userId = session?.user?.id ?? null;

  // Refresh word count each time the tab is focused
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      getSavedWordCount(userId)
        .then(setWordCount)
        .catch(console.error);
    }, [userId]),
  );

  async function handleStart() {
    if (!userId) return;
    setPhase('loading');
    try {
      const qs = await generateSession(userId, sessionLength);
      if (!qs) {
        // Shouldn't happen if word count is ≥5, but guard anyway
        setPhase('entry');
        return;
      }
      setQuestions(qs);
      setCurrentIndex(0);
      setAnswers([]);
      setPhase('session');
    } catch (err) {
      console.error('[quiz] generateSession error:', err);
      setPhase('entry');
    }
  }

  function handleAnswer(result: AnswerResult, userAnswer: string) {
    if (!userId) return;
    const question = questions[currentIndex];
    const expectedAnswer =
      question.format === 'fill_in_sentence'
        ? (question as FillInQuestion).correctAnswer
        : (question as MCQuestion).correctOption;

    const answer: RecordedAnswer = {
      wordId: question.word.id,
      format: question.format,
      result,
      userAnswer,
      expectedAnswer,
    };
    setAnswers((prev) => [...prev, answer]);

    // Persist to SQLite (fire-and-forget; sync handles the Supabase push)
    dbRecordAnswer(userId, question.word.id, question.format, result, userAnswer, expectedAnswer).catch(
      console.error,
    );
  }

  function handleContinue() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPhase('summary');
    }
  }

  function handleQuit() {
    setPhase('summary');
  }

  function handleDone() {
    setPhase('entry');
    setQuestions([]);
    setAnswers([]);
    // Refresh word count so the entry screen is up-to-date
    if (userId) getSavedWordCount(userId).then(setWordCount).catch(console.error);
  }

  if (phase === 'entry' || phase === 'loading') {
    return (
      <EntryScreen
        wordCount={wordCount}
        sessionLength={sessionLength}
        onChangeLength={setSessionLength}
        onStart={handleStart}
        loading={phase === 'loading'}
      />
    );
  }

  if (phase === 'session') {
    return (
      <SessionScreen
        questions={questions}
        currentIndex={currentIndex}
        onAnswer={handleAnswer}
        onContinue={handleContinue}
        onQuit={handleQuit}
      />
    );
  }

  // summary
  return (
    <SummaryScreen
      answers={answers}
      questions={questions}
      onDone={handleDone}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type OptionState = 'neutral' | 'correct' | 'wrong' | 'missed';

function getOptionState(
  answered: boolean,
  isSelected: boolean,
  isCorrect: boolean,
): OptionState {
  if (!answered) return 'neutral';
  if (isCorrect) return 'correct';
  if (isSelected && !isCorrect) return 'wrong';
  return 'neutral';
}

function optionBg(state: OptionState, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (state) {
    case 'correct':
      return '#16a34a18';
    case 'wrong':
      return '#dc262618';
    default:
      return colors.surface.card;
  }
}

function optionBorder(state: OptionState, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (state) {
    case 'correct':
      return '#16a34a';
    case 'wrong':
      return '#dc2626';
    default:
      return colors.border.subtle;
  }
}

function optionTextColor(
  state: OptionState,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (state) {
    case 'correct':
      return '#16a34a';
    case 'wrong':
      return '#dc2626';
    default:
      return colors.text.primary;
  }
}

function formatLabel(format: string): string {
  switch (format) {
    case 'def_to_word':
      return t('Definition → Word');
    case 'word_to_def':
      return t('Word → Definition');
    case 'synonym':
      return t('Find the synonym');
    case 'fill_in_sentence':
      return t('Fill in the blank');
    case 'word_for_description':
      return t('Which word fits?');
    default:
      return '';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Entry
  entryContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  entryTitle: { textAlign: 'center' },
  entrySubtitle: { textAlign: 'center', marginBottom: 8 },
  lengthSection: { width: '100%', gap: 12 },
  lengthLabel: { textAlign: 'center' },
  lengthRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  lengthChip: {
    width: 56,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: { width: '100%', marginTop: 8 },

  // Progress
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  // Session
  sessionContent: { flexGrow: 1, paddingBottom: 32 },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  questionBody: { paddingHorizontal: 16, gap: 16 },
  formatLabel: { textTransform: 'uppercase', letterSpacing: 0.8 },
  promptBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  promptWord: { fontSize: 32, lineHeight: 44, textAlign: 'center' },
  promptDef: { lineHeight: 24 },
  optionsContainer: { gap: 10 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: { flex: 1 },
  optionTick: { fontSize: 18, marginLeft: 8 },
  // Letter-box fill-in
  letterBoxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  letterBox: {
    width: 40,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBoxText: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  checkButton: { marginTop: 4 },
  continueButton: { marginHorizontal: 16, marginTop: 16 },

  // Summary
  summaryContent: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
  },
  summaryTitle: { textAlign: 'center', marginBottom: 4 },
  scoreCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 6,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  scoreNum: {
    fontSize: 64,
    lineHeight: 72,
    fontFamily: 'SourceSerif4_500Medium',
  },
  scoreDenom: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: 'Inter_400Regular',
  },
  breakdownRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    gap: 4,
  },
  statNum: { fontSize: 32 },
  missedSection: { gap: 0 },
  missedHeading: { marginBottom: 8 },
  missedRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  doneButton: { marginTop: 8 },
});
