"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";

import {
  addProgressNoteAction,
  type ProgressNoteState,
} from "./actions";

// Minimal Web Speech API typings — TS doesn't ship them by default.
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const initial: ProgressNoteState = {};

export function ProgressNoteForm({ shiftId }: { shiftId: string }) {
  const [state, dispatch, pending] = useActionState(
    addProgressNoteAction.bind(null, shiftId),
    initial
  );

  const [body, setBody] = useState("");
  const [isHandover, setIsHandover] = useState(false);
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setVoiceSupported(!!Ctor);
  }, []);

  useEffect(() => {
    if (state.ok) {
      setBody("");
      setIsHandover(false);
      setVoiceUsed(false);
    }
  }, [state]);

  const toggleVoice = () => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceError(
        "Voice input isn't supported on this device. Try Chrome on Android or Safari on iOS."
      );
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-AU";
    r.onresult = (e) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        }
      }
      if (finalText) {
        setBody((prev) => (prev ? `${prev} ${finalText}` : finalText));
        setVoiceUsed(true);
      }
    };
    r.onerror = (e) => {
      setVoiceError(`Voice input error: ${e.error}`);
      setListening(false);
    };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    setVoiceError(null);
    setListening(true);
    try {
      r.start();
    } catch (err) {
      setListening(false);
      setVoiceError(err instanceof Error ? err.message : "Voice start failed");
    }
  };

  return (
    <form action={dispatch} className="space-y-3">
      <input
        type="hidden"
        name="inputMethod"
        value={voiceUsed ? "VOICE" : "KEYBOARD"}
      />
      <div className="space-y-2">
        <Label htmlFor="note-body" className="text-xs">
          What happened
        </Label>
        <Textarea
          id="note-body"
          name="body"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe what happened during the shift — activities, mood, anything notable."
          aria-invalid={!!state.fieldErrors?.body}
        />
        {state.fieldErrors?.body && (
          <p className="text-xs text-destructive">{state.fieldErrors.body}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant={listening ? "destructive" : "outline"}
            onClick={toggleVoice}
            disabled={!voiceSupported && !listening}
          >
            {listening ? <MicOff /> : <Mic />}
            {listening
              ? "Stop dictating"
              : voiceSupported
              ? "Dictate"
              : "Voice unavailable"}
          </Button>
          {voiceUsed && !listening && (
            <span className="text-[11px] text-muted-foreground">
              This note was dictated — please proofread.
            </span>
          )}
        </div>
        {voiceError && (
          <p className="text-xs text-destructive">{voiceError}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          name="isHandover"
          checked={isHandover}
          onCheckedChange={(v) => setIsHandover(!!v)}
          value="on"
        />
        Mark as end-of-shift handover note
      </label>

      <FormError message={state.error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save note"}
      </Button>
    </form>
  );
}