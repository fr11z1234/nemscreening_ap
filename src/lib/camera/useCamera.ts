"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureFromVideo, type Captured } from "./compress";

export type CameraState = "starting" | "ready" | "denied" | "unavailable";

/** Hvad der skal til for at faa sogeren i gang igen. */
export type Genoptagelse = "start" | "tildel" | "afspil" | "intet";

/**
 * Hvorfor sogeren staar stille — og dermed hvad der skal goeres ved det.
 *
 * Der er tre maader at miste billedet paa, og de kraever hver sit:
 *
 *   start   Sporet er doet. Browseren lukkede kameraet, typisk fordi fanen har
 *           vaeret i baggrunden laenge. Der skal en ny stroem til.
 *   tildel  Stroemmen lever, men elementet har den ikke. Sker naar videoen er
 *           blevet monteret paa ny — `start` saetter kun `srcObject` en gang.
 *   afspil  Stroemmen lever, elementet har den, men det staar paa pause.
 *
 * Den sidste er den, ingen taenkte paa. En systemdialog — `window.confirm`, en
 * filvaelger — suspenderer siden, og browseren saetter videoen paa pause.
 * Sporet lever videre, saa kontrollen «lever sporet?» siger ja og goer intet.
 * Sogeren frøs paa det sidste billede, indtil screeneren gik ud af proven og
 * ind igen — for saa blev komponenten monteret forfra.
 *
 * Reglen staar her og ikke inde i en effekt, saa `verify:kamera` kan naa den.
 */
export function genoptagelse(
  sporLever: boolean,
  elementHarStroemmen: boolean,
  paaPause: boolean,
): Genoptagelse {
  if (!sporLever) return "start";
  if (!elementHarStroemmen) return "tildel";
  return paaPause ? "afspil" : "intet";
}

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
          /*
           * STAAENDE, fordi begge sogere er staaende — og fordi papiret er.
           *
           * Der blev bedt om 1920x1080, altsa liggende 16:9. Sogeren viste
           * strommen i en liggende 4:3-kasse med `object-fit: cover`, og
           * optagelsen tegnede hele strommen: en fjerdedel af bredden laa uden
           * for skaermen og kom alligevel med i filen.
           *
           * Formen var ogsaa forkert. Billedet ender enten som rapportens
           * forside — et staaende A4 — eller i provesidens ramme paa 89 x 130
           * mm. Et liggende billede fylder 67 mm af de 130, og halvdelen af den
           * plads, arket blev vendt for at give billedet, star tom.
           *
           * 3:4 er telefonens egen sensor rejst op. De to sogere er ikke
           * praecis ens (0,685 og 0,707), og det gor ikke noget: `ideal` er et
           * onske, og `synligtUdsnit` i compress.ts skaerer bagefter til
           * praecis den soger, screeneren kiggede i. Denne her soerger blot for,
           * at der er saa lidt som muligt at skaere vaek — hojden er den dyre
           * led, og den bliver bevaret.
           *
           * 1200x1600 og ikke mere: MAX_EDGE er 1600, sa alt derover bliver
           * alligevel skaleret ned igen.
           */
          aspectRatio: { ideal: 3 / 4 },
          width: { ideal: 1200 },
          height: { ideal: 1600 },
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

  /**
   * Faar sogeren i gang igen, hvad end der stoppede den.
   *
   * Kaldes bade af sig selv — naar fanen kommer frem, og naar videoen bliver
   * sat paa pause — og af den der aabner en systemdialog. Se `genoptagelse`
   * for de tre tilfaelde.
   */
  const resume = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    const lever =
      stream?.getVideoTracks().some((t) => t.readyState === "live") ?? false;

    switch (genoptagelse(lever, !!video && video.srcObject === stream, !!video?.paused)) {
      case "start":
        await start();
        return;
      case "tildel":
        if (video && stream) video.srcObject = stream;
        break;
      case "intet":
        return;
    }
    await video?.play().catch(() => {});
  }, [start]);

  // Browsere stopper strommen nar fanen har vaeret i baggrunden. Uden det her
  // kommer screeneren tilbage til et sort felt efter et opkald.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void resume();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [resume]);

  /*
   * Og saa den, der ikke kunne ses: en systemdialog saetter videoen paa pause.
   *
   * `window.confirm` foran en sletning, eller filvaelgeren, suspenderer siden.
   * Stroemmen lever videre, saa kontrollen ovenfor gor intet — sogeren stod og
   * frøs, indtil screeneren gik ud af proven og ind igen.
   *
   * Kun mens siden er fremme. Braekker browseren afspilningen af, fordi fanen
   * er gaaet i baggrunden, ville et svar her blive til en loekke af pause og
   * play; naar fanen kommer frem igen, tager kontrollen ovenfor den.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function onPause() {
      if (document.visibilityState !== "visible") return;
      void resume();
    }
    video.addEventListener("pause", onPause);
    return () => video.removeEventListener("pause", onPause);
  }, [resume]);

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
    /**
     * Kaldes efter en systemdialog. Pause-lytteren ovenfor tager den som regel
     * selv, men den bygger paa at browseren rent faktisk sender et
     * `pause`-event — og det er ikke noget, vi kan kontrollere. Et kald her
     * koster ingenting, naar der ikke er noget at genoptage.
     */
    resume,
    torchOn,
    torchSupported,
    toggleTorch,
  };
}
