import { useRef, useCallback, useState } from 'react';

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const mimeTypeRef = useRef<string>('video/webm');
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecording = useCallback((canvas: HTMLCanvasElement) => {
    if (mediaRecorderRef.current) return;
    chunksRef.current = [];
    blobRef.current = null;
    setIsReady(false);

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      blobRef.current = new Blob(chunksRef.current, { type: mimeType });
      setIsRecording(false);
      setIsReady(true);
      mediaRecorderRef.current = null;
    };

    recorder.start(100); // collect a chunk every 100 ms
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (stopTimeoutRef.current !== null) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const scheduleStop = useCallback(
    (delayMs = 2500) => {
      if (stopTimeoutRef.current !== null) {
        clearTimeout(stopTimeoutRef.current);
      }
      stopTimeoutRef.current = setTimeout(stopRecording, delayMs);
    },
    [stopRecording],
  );

  const downloadRecording = useCallback(() => {
    const blob = blobRef.current;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'battle-royale.webm';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const resetReady = useCallback(() => {
    blobRef.current = null;
    setIsReady(false);
  }, []);

  return { isRecording, isReady, startRecording, stopRecording, scheduleStop, downloadRecording, resetReady };
}
