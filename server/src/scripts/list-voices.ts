import "../config.js";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const LOCALES = ["es-US", "en-US", "fr-FR", "de-DE", "it-IT"] as const;

async function main(): Promise<void> {
  const tts = new TextToSpeechClient();
  for (const languageCode of LOCALES) {
    console.log(`\n=== Voices for ${languageCode} ===`);
    try {
      const [res] = await tts.listVoices({ languageCode });
      const voices = (res.voices ?? [])
        .filter((v) =>
          /Journey|Chirp|Neural2|Wavenet|Studio/i.test(v.name ?? "")
        )
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

      for (const v of voices) {
        console.log(
          `${v.name ?? "unknown"}\t${v.ssmlGender ?? "UNKNOWN"}\t${v.naturalSampleRateHertz ?? 0}Hz`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAIL ${languageCode}: ${msg}`);
    }
  }
}

await main();
