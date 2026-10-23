import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import {
  readLegalReaderIndexPackage,
  readLegalReaderParagraphs,
} from "./legalStorage";

export interface TTSParagraph {
  paragraphId: string;
  text: string;
}

export interface TTSQueueContext {
  codeId: string;
  language: string;
  versionId: string;
  sectionId: string;
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  isWaitingForNextSection: boolean;
  currentParagraphIndex: number;
  queueContext: TTSQueueContext | null;
  paragraphs: TTSParagraph[];
  autoPlayNext: boolean;
  needsNextSection: boolean;
  speechRate: number;
}

let state: TTSState = {
  isPlaying: false,
  isPaused: false,
  isWaitingForNextSection: false,
  currentParagraphIndex: -1,
  queueContext: null,
  paragraphs: [],
  autoPlayNext: false,
  needsNextSection: false,
  speechRate: 1.0,
};

const listeners = new Set<(state: TTSState) => void>();

function setState(partial: Partial<TTSState>) {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener(state));
}

export function useGlobalTTS() {
  const [localState, setLocalState] = useState(state);
  
  useEffect(() => {
    listeners.add(setLocalState);
    return () => {
      listeners.delete(setLocalState);
    };
  }, []);
  
  return localState;
}

function cleanTextForSpeech(text: string, language: string): string {
  let cleaned = text;
  // Strip footnotes like [1], [23]
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  // Clean multiple spaces/newlines
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim();
}

async function safeStopSpeech() {
  try {
    await Speech.stop();
  } catch (error) {
    console.warn("Failed to stop TTS cleanly:", error);
  }
}

let isStopping = false;
let playbackToken = 0;

const speakNextParagraph = async (token: number) => {
  if (isStopping || token !== playbackToken) return;
   
  const { currentParagraphIndex, paragraphs, queueContext, autoPlayNext, speechRate } = state;
   
  if (currentParagraphIndex >= paragraphs.length - 1) {
    if (autoPlayNext && queueContext) {
      setState({ isWaitingForNextSection: true });
      try {
        const { codeId, language, sectionId } = queueContext;
        const indexPackage = await readLegalReaderIndexPackage({ codeId, language });
        
        if (indexPackage && !isStopping && token === playbackToken) {
           const currentIndex = indexPackage.sections.findIndex(s => s.sectionId === sectionId);
           if (currentIndex >= 0 && currentIndex < indexPackage.sections.length - 1) {
             const nextSection = indexPackage.sections[currentIndex + 1];
             const nextParagraphs = await readLegalReaderParagraphs({
               codeId,
               language,
               sectionIds: [nextSection.sectionId]
             });
             
             if (nextParagraphs.length > 0 && !isStopping && token === playbackToken) {
               // Successfully loaded next section!
               const nextContext = { ...queueContext, sectionId: nextSection.sectionId };
               setState({
                 queueContext: nextContext,
                 paragraphs: nextParagraphs,
                 currentParagraphIndex: -1,
                 isWaitingForNextSection: false,
               });
               // Continue playing the new paragraphs
               void speakNextParagraph(token);
               return;
             }
           }
        }
      } catch (err) {
        console.warn("Auto-play background fetch failed:", err);
      }
      // If we fall through here, there's no next section or it failed.
      await stopGlobalTTS();
    } else {
      await stopGlobalTTS();
    }
    return;
  }

  const nextIndex = currentParagraphIndex + 1;
  setState({ currentParagraphIndex: nextIndex });
  
  const paragraph = paragraphs[nextIndex];
  const language = queueContext?.language || 'th';
  const cleanedText = cleanTextForSpeech(paragraph.text, language);
   
  if (!cleanedText) {
    speakNextParagraph(token);
    return;
  }

  const speechLanguage = language === 'th' ? 'th-TH' : 'en-US';

  Speech.speak(cleanedText, {
    language: speechLanguage,
    rate: speechRate,
    onDone: () => {
      if (!isStopping && token === playbackToken) {
        speakNextParagraph(token);
      }
    },
    onError: (err) => {
      if (token === playbackToken) {
        console.warn("TTS Error:", err);
        stopGlobalTTS();
      }
    },
  });
};

export const startGlobalTTS = async (
  context: TTSQueueContext,
  paragraphs: TTSParagraph[],
  startFromIndex = 0
) => {
  const nextToken = playbackToken + 1;
  playbackToken = nextToken;
  await safeStopSpeech();
  isStopping = false;
   
  setState({
    isPlaying: true,
    isPaused: false,
    isWaitingForNextSection: false,
    queueContext: context,
    paragraphs,
    currentParagraphIndex: startFromIndex - 1,
    needsNextSection: false,
  });
   
  speakNextParagraph(nextToken);
};

export const stopGlobalTTS = async () => {
  playbackToken += 1;
  isStopping = true;
  setState({
    isPlaying: false,
    isPaused: false,
    isWaitingForNextSection: false,
    currentParagraphIndex: -1,
    queueContext: null,
    paragraphs: [],
    needsNextSection: false,
  });
  await safeStopSpeech();
};

export const pauseGlobalTTS = async () => {
  isStopping = true;
  setState({ isPlaying: false, isPaused: true });
  await safeStopSpeech();
};

export const resumeGlobalTTS = async () => {
  const nextToken = playbackToken + 1;
  playbackToken = nextToken;
  isStopping = false;
  setState({ isPlaying: true, isPaused: false });
  
  // To resume, we step back one paragraph index so we read the current one again from the start
  if (state.currentParagraphIndex > 0) {
    setState({ currentParagraphIndex: state.currentParagraphIndex - 1 });
  } else {
    setState({ currentParagraphIndex: -1 });
  }
  
  void speakNextParagraph(nextToken);
};

export const toggleGlobalAutoPlay = () => {
  setState({ autoPlayNext: !state.autoPlayNext });
};

export const clearNeedsNextSection = () => {
  setState({ needsNextSection: false });
};

export const cycleGlobalSpeechRate = () => {
  const rates = [0.8, 1.0, 1.25, 1.5, 2.0];
  const currentIndex = rates.indexOf(state.speechRate);
  const nextIndex = (currentIndex + 1) % rates.length;
  setState({ speechRate: rates[nextIndex] });
};
