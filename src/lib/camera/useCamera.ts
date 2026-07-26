"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureFromVideo, type Captured } from "./compress";

export type CameraState = "starting" | "ready" | "denied" | "unavailable";

/** Torch er ikke i TypeScripts DOM-typer endnu, men understottes pa Android. */
type TorchConstraint = { torch: boolean };

/**
 * Live kamerastrom med bagkameraet.
 *
 * Kraever HTTPS. Virker i hjemmeskaerms-PWA'er pa iOS fra 14.3 og frem; falder
 * ellers tilbage til systemets kamera via en filvaelger, sa screeneren aldrig
 * star uden mulighed for at tage et billede.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }

    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as
        | (MediaTrackCapabilities & { torch?: boolean })
        | undefined;
      setTorchSupported(Boolean(caps?.torch));

      setState("ready");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setState(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : "unavailable",
      );
    }
  }, []);

  useEffect(() => {
    // At abne og lukke en kamerastrom ER synkronisering med et eksternt
    // system, som effekter er til for. Reglen kan ikke se forskel pa det og
    // en afledt vaerdi der burde beregnes under render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start();
    return stop;
  }, [start, stop]);

  // Browsere stopper strommen nar fanen har vaeret i baggrunden. Uden det her
  // kommer screeneren tilbage til et sort felt efter et opkald.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const live = streamRef.current
        ?.getVideoTracks()
        .some((t) => t.readyState === "live");
      if (!live) start();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [start]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as TorchConstraint],
      } as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  const capture = useCallback(async (): Promise<Captured | null> => {
    const video = videoRef.current;
    if (!video || state !== "ready" || !video.videoWidth) return null;
    return captureFromVideo(video);
  }, [state]);

  return {
    videoRef,
    state,
    capture,
    retry: start,
    torchOn,
    torchSupported,
    toggleTorch,
  };
}
