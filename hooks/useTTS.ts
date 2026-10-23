import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface TTSParagraph {
  paragraphId: string;
  text: string;
}

// Helper to clean text before reading
function cleanTextForSpeech(text: string, language: string): string {
  let cleaned = text;
  // Remove footnotes like [1], [23]
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  // Remove multiple spaces/newlines
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim();
}

export function useTTS(language: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1);
  
  const paragraphsRef = useRef<TTSParagraph[]>([]);
  const currentIndexRef = useRef(-1);
  const isPlayingRef = useRef(false);
  const isStoppingRef = useRef(false);

  const syncState = () => {
    setIsPlaying(isPlayingRef.current);
    setCurrentParagraphIndex(currentIndexRef.current);
  };

  const speakNextParagraph = useCallback(async () => {
    if (isStoppingRef.current) return;
    
    if (currentIndexRef.current >= paragraphsRef.current.length - 1) {
      // Reached the end
      stopTTS();
      return;
    }

    currentIndexRef.current++;
    syncState();
    
    const paragraph = paragraphsRef.current[currentIndexRef.current];
    const cleanedText = cleanTextForSpeech(paragraph.text, language);
    
    if (!cleanedText) {
      // Skip empty paragraphs
      speakNextParagraph();
      return;
    }

    const speechLanguage = language === 'th' ? 'th-TH' : 'en-US';

    Speech.speak(cleanedText, {
      language: speechLanguage,
      // Adjust speech rate slightly for better listening experience if needed
      rate: language === 'th' ? 0.9 : 1.0, 
      onDone: () => {
        if (!isStoppingRef.current) {
          speakNextParagraph();
        }
      },
      onError: (err) => {
        console.warn("TTS Error:", err);
        stopTTS();
      },
    });
  }, [language]);

  const startTTS = useCallback(async (paragraphs: TTSParagraph[]) => {
    await Speech.stop(); // Stop anything currently playing
    
    paragraphsRef.current = paragraphs;
    currentIndexRef.current = -1;
    isPlayingRef.current = true;
    isStoppingRef.current = false;
    syncState();
    
    speakNextParagraph();
  }, [speakNextParagraph]);

  const stopTTS = useCallback(async () => {
    isStoppingRef.current = true;
    isPlayingRef.current = false;
    currentIndexRef.current = -1;
    syncState();
    await Speech.stop();
  }, []);

  const toggleTTS = useCallback(async (paragraphs: TTSParagraph[]) => {
    if (isPlayingRef.current) {
      await stopTTS();
    } else {
      await startTTS(paragraphs);
    }
  }, [startTTS, stopTTS]);

  // Cleanup on unmount or language change
  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, [stopTTS]);

  return {
    isPlaying,
    currentParagraphIndex,
    startTTS,
    stopTTS,
    toggleTTS,
  };
}
