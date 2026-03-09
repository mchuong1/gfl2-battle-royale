import { useRef, useCallback, useState, useEffect } from 'react';

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonically-increasing counter; each recording session gets its own ID.
  // onstop checks that the session hasn't been superseded before writing state.
  const sessionIdRef = useRef(0);

  const startRecording = useCallback((canvas: HTMLCanvasElement) => {
    if (mediaRecorderRef.current) return;
    chunksRef.current = [];
    blobRef.current = null;
    setIsReady(false);

    const sessionId = ++sessionIdRef.current;

    const stream = canvas.captureStream(30);
    streamRef.current = stream;
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      // Guard against a new session starting before this onstop fires.
      if (sessionIdRef.current !== sessionId) return;
      // Use recorder.mimeType — the type the browser actually negotiated,
      // which may differ from (or be a superset of) the requested mimeType.
      blobRef.current = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
      setIsRecording(false);
      setIsReady(true);
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
    if (!recorder) {
      // No recorder — still clean up any orphaned stream tracks.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    if (recorder.state !== 'inactive') {
      recorder.stop(); // track cleanup happens in onstop
    }
  }, []);

  useEffect(() => {
    return () => {
      // Clean up on unmount: cancel any pending stop timeout, stop the
      // recorder (if still running), and release all stream tracks.
      if (stopTimeoutRef.current !== null) {
        clearTimeout(stopTimeoutRef.current);
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
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
    // Revoke after a short delay so the browser has time to begin the
    // download navigation before the object URL is invalidated.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  const resetReady = useCallback(() => {
    blobRef.current = null;
    setIsReady(false);
  }, []);

  return { isRecording, isReady, startRecording, stopRecording, scheduleStop, downloadRecording, resetReady };
}
