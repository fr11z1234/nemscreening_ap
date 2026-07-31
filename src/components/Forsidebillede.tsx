"use client";

import { useEffect, useRef, useState } from "react";
import { useCamera } from "@/lib/camera/useCamera";
import { compressImageFile, type Captured } from "@/lib/camera/compress";

/**
 * Billedet af ejendommen, taget nar sagen oprettes.
 *
 * Samme greb som i provetagningen: en firkant med live-kamera, man trykker
 * pa. Efter et tryk staar billedet i firkanten med et kryds i hjornet, sa det
 * kan tages om.
 *
 * Billedet holdes lokalt indtil sagen findes — der er ingen sag at haenge det
 * pa endnu — og laegges op af den der kalder, nar id'et er kommet retur.
 *
 * Visningen ejes her og ikke af den der kalder: object-URL'en skal frigives
 * praecis nar billedet skiftes, og det ved kun den der skifter det.
 */
export function Forsidebillede({
  onSkift,
}: {
  onSkift: (b: Captured | null) => void;
}) {
  const {
    videoRef,
    state: cameraState,
    capture,
    retry,
    torchOn,
    torchSupported,
    toggleTorch,
  } = useCamera();
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);

  // Object-URL'en laves nar billedet skifter og frigives med det samme igen.
  // Uden det bliver hver blob liggende i hukommelsen, ogsa de kasserede.
  const aktiv = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (aktiv.current) URL.revokeObjectURL(aktiv.current);
    },
    [],
  );

  function saet(naeste: Captured | null) {
    if (aktiv.current) URL.revokeObjectURL(aktiv.current);
    aktiv.current = naeste ? URL.createObjectURL(naeste.blob) : null;
    setUrl(aktiv.current);
    onSkift(naeste);
  }

  async function tag() {
    setFejl(null);
    const skud = await capture();
    if (!skud) {
      setFejl("Billedet kunne ikke tages. Prøv igen.");
      return;
    }
    saet(skud);
  }

  async function vaelgFil(e: React.ChangeEvent<HTMLInputElement>) {
    const fil = e.target.files?.[0];
    e.target.value = "";
    if (!fil) return;
    setFejl(null);
    try {
      saet(await compressImageFile(fil));
    } catch {
      setFejl("Billedet kunne ikke læses.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Forsidebillede</span>

      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-black">
        {/*
          Videoen bliver staaende, ogsa mens billedet vises ovenpa.
          Rev vi den ud af DOM'en, ville krydset montere et NYT videoelement,
          og det har aldrig faaet stroemmen tildelt — useCamera saetter kun
          srcObject nar den starter. Firkanten var sort bagefter.
        */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
        />

        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Forsidebillede af ejendommen"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Selve billedet er ikke en knap — krydset er, sa et tilfaeldigt
                tryk ikke koster billedet. */}
            <button
              type="button"
              onClick={() => saet(null)}
              aria-label="Tag et nyt billede"
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/65 text-lg leading-none text-white hover:bg-black/80"
            >
              ×
            </button>
          </>
        ) : (
          <>
            {cameraState === "ready" ? (
              <button
                type="button"
                onClick={tag}
                aria-label="Tag forsidebillede"
                className="absolute inset-0"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white">
                <p className="text-sm">
                  {cameraState === "starting"
                    ? "Starter kamera…"
                    : cameraState === "denied"
                      ? "Appen har ikke adgang til kameraet."
                      : "Live-kamera kræver en sikker forbindelse (https)."}
                </p>
                <div className="flex gap-2">
                  {cameraState === "denied" && (
                    <button
                      type="button"
                      onClick={retry}
                      className="tap rounded-lg border border-white/40 px-4 hover:bg-white/10"
                    >
                      Prøv igen
                    </button>
                  )}
                  {cameraState !== "starting" && (
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="tap rounded-lg bg-white px-4 text-black hover:bg-white/85"
                    >
                      Brug systemets kamera
                    </button>
                  )}
                </div>
              </div>
            )}

            {cameraState === "ready" && torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                aria-pressed={torchOn}
                className="tap absolute right-3 top-3 rounded-full bg-black/50 px-3 text-white hover:bg-black/70"
              >
                {torchOn ? "Lys fra" : "Lys til"}
              </button>
            )}
          </>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={vaelgFil}
        className="hidden"
      />

      {fejl ? (
        <p className="text-xs text-danger">{fejl}</p>
      ) : (
        <p className="text-xs text-muted">
          {url
            ? "Bliver baggrund på rapportens forside. Tryk på krydset for at tage et nyt."
            : "Tryk på firkanten. Ejendommen set forfra — den bliver rapportens forside."}
        </p>
      )}
    </div>
  );
}
