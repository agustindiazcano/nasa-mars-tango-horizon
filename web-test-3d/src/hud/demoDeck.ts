import { t } from "@th/shared";

export interface DeckButton {
  key: string;
  labelKey: string;
  run(): void;
}

export interface DemoDeckHooks {
  voice(text: string): void;
  scenario(id: "storm" | "sep2017" | "leak"): void;
  openProvenance(): void;
  runVision(unitId: string, question: string): void;
  enableFanTrend(): void;
  reset(): void;
}

export function createDemoDeck(hooks: DemoDeckHooks): DeckButton[] {
  return [
    { key: "1", labelKey: "deck.1", run: () => hooks.voice(t("deck.say.1")) },
    { key: "2", labelKey: "deck.2", run: () => hooks.voice(t("deck.say.2")) },
    { key: "3", labelKey: "deck.3", run: () => hooks.runVision("rover-2", t("deck.say.3")) },
    {
      key: "4",
      labelKey: "deck.4",
      run: () => {
        hooks.enableFanTrend();
        hooks.voice(t("deck.say.4"));
      },
    },
    { key: "5", labelKey: "deck.5", run: () => hooks.scenario("storm") },
    { key: "6", labelKey: "deck.6", run: () => hooks.scenario("sep2017") },
    { key: "7", labelKey: "deck.7", run: () => hooks.scenario("leak") },
    { key: "8", labelKey: "deck.8", run: () => hooks.runVision("rover-2", t("deck.say.8")) },
    { key: "9", labelKey: "deck.9", run: () => hooks.openProvenance() },
    { key: "0", labelKey: "deck.0", run: () => hooks.reset() },
  ];
}
