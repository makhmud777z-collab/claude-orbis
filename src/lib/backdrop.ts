import { loc, type Loc } from "./i18n";

/**
 * Фон портала.
 *
 * Девять вариантов нарисованы градиентами, а не сняты фотоаппаратом, и это
 * решение, а не упрощение. Фотография на фоне рабочего экрана стоит дорого
 * тремя способами: мегабайты на каждой загрузке, права на снимок, и —
 * главное — шум под цифрами. Портал открыт весь день, и фон обязан
 * оставаться фоном: на нём читают телефоны и суммы договоров.
 *
 * Поэтому варианты мягкие и бессюжетные: пятна света, уходящие за край
 * экрана. Данные от смены фона не меняются — меняется только холст под
 * карточками, а сами карточки становятся полупрозрачными, чтобы фон был
 * виден, и ровно настолько, чтобы текст на них не терял контраст.
 */
export type Backdrop =
  | "none"
  | "dawn"
  | "mist"
  | "pine"
  | "dusk"
  | "sand"
  | "sea"
  | "lilac"
  | "slate"
  | "ember";

export interface BackdropSpec {
  key: Backdrop;
  label: Loc;
  /** слои для светлой темы: первым идёт верхний */
  light: string;
  /** на тёмной теме те же пятна глуше, иначе фон спорит с текстом */
  dark: string;
}

/**
 * Каждый вариант — два-три радиальных пятна поверх ровной заливки.
 * Пятна уходят за край: так фон не читается как картинка с центром и не
 * притягивает взгляд от содержимого.
 */
export const BACKDROPS: BackdropSpec[] = [
  {
    key: "none",
    label: loc("Без фона", "Fonsiz"),
    light: "",
    dark: "",
  },
  {
    key: "dawn",
    label: loc("Рассвет", "Tong"),
    light:
      "radial-gradient(1200px 700px at 12% -10%, #ffc9ad 0%, transparent 62%), radial-gradient(1000px 620px at 92% 8%, #c7d6ff 0%, transparent 58%), linear-gradient(180deg, #fdece2 0%, #ecedf7 74%)",
    dark:
      "radial-gradient(1200px 700px at 12% -10%, #3a2320 0%, transparent 64%), radial-gradient(1000px 620px at 92% 8%, #1b2340 0%, transparent 60%), linear-gradient(180deg, #121014 0%, #0a0b10 74%)",
  },
  {
    key: "mist",
    label: loc("Туман", "Tuman"),
    light:
      "radial-gradient(1100px 640px at 78% -12%, #c9daed 0%, transparent 60%), radial-gradient(900px 560px at 6% 22%, #dde6f2 0%, transparent 58%), linear-gradient(180deg, #eef2f9 0%, #e5eaf4 100%)",
    dark:
      "radial-gradient(1100px 640px at 78% -12%, #1a2230 0%, transparent 62%), radial-gradient(900px 560px at 6% 22%, #141922 0%, transparent 60%), linear-gradient(180deg, #0d1016 0%, #0a0b10 100%)",
  },
  {
    key: "pine",
    label: loc("Хвоя", "Igna"),
    light:
      "radial-gradient(1000px 620px at 88% -8%, #bbe0d0 0%, transparent 60%), radial-gradient(900px 540px at 4% 30%, #d6ece0 0%, transparent 56%), linear-gradient(180deg, #eaf4ef 0%, #e8eef3 100%)",
    dark:
      "radial-gradient(1000px 620px at 88% -8%, #13302a 0%, transparent 62%), radial-gradient(900px 540px at 4% 30%, #102420 0%, transparent 58%), linear-gradient(180deg, #0a1210 0%, #0a0b10 100%)",
  },
  {
    key: "dusk",
    label: loc("Сумерки", "Shom"),
    light:
      "radial-gradient(1200px 700px at 20% -14%, #c9ccf8 0%, transparent 62%), radial-gradient(900px 560px at 95% 18%, #e0c7f2 0%, transparent 58%), linear-gradient(180deg, #eeedfa 0%, #e9ebf6 100%)",
    dark:
      "radial-gradient(1200px 700px at 20% -14%, #1d1c3d 0%, transparent 64%), radial-gradient(900px 560px at 95% 18%, #2a1a35 0%, transparent 60%), linear-gradient(180deg, #0e0d16 0%, #0a0b10 100%)",
  },
  {
    key: "sand",
    label: loc("Песок", "Qum"),
    light:
      "radial-gradient(1100px 660px at 10% -10%, #efdcbc 0%, transparent 60%), radial-gradient(920px 560px at 90% 14%, #ead8c4 0%, transparent 56%), linear-gradient(180deg, #f8f1e5 0%, #eeeef3 100%)",
    dark:
      "radial-gradient(1100px 660px at 10% -10%, #2d2619 0%, transparent 62%), radial-gradient(920px 560px at 90% 14%, #2a211b 0%, transparent 58%), linear-gradient(180deg, #121010 0%, #0a0b10 100%)",
  },
  {
    key: "sea",
    label: loc("Море", "Dengiz"),
    light:
      "radial-gradient(1150px 680px at 84% -12%, #b6ddee 0%, transparent 60%), radial-gradient(900px 560px at 8% 26%, #cfe8f2 0%, transparent 56%), linear-gradient(180deg, #eaf5fa 0%, #e8edf5 100%)",
    dark:
      "radial-gradient(1150px 680px at 84% -12%, #0f2b38 0%, transparent 62%), radial-gradient(900px 560px at 8% 26%, #0d212c 0%, transparent 58%), linear-gradient(180deg, #091014 0%, #0a0b10 100%)",
  },
  {
    key: "lilac",
    label: loc("Сирень", "Nilufar"),
    light:
      "radial-gradient(1050px 640px at 16% -10%, #e7c9ee 0%, transparent 60%), radial-gradient(950px 580px at 92% 20%, #cfcaf4 0%, transparent 58%), linear-gradient(180deg, #f3ebf7 0%, #ebecf6 100%)",
    dark:
      "radial-gradient(1050px 640px at 16% -10%, #2b1a30 0%, transparent 62%), radial-gradient(950px 580px at 92% 20%, #1e1b3a 0%, transparent 58%), linear-gradient(180deg, #0f0c14 0%, #0a0b10 100%)",
  },
  {
    key: "slate",
    label: loc("Графит", "Grafit"),
    light:
      "radial-gradient(1100px 660px at 72% -14%, #d5dbe6 0%, transparent 58%), radial-gradient(900px 540px at 10% 24%, #dfe3ec 0%, transparent 56%), linear-gradient(180deg, #edeff4 0%, #e4e7ef 100%)",
    dark:
      "radial-gradient(1100px 660px at 72% -14%, #1c1f26 0%, transparent 60%), radial-gradient(900px 540px at 10% 24%, #16191f 0%, transparent 58%), linear-gradient(180deg, #0c0d11 0%, #0a0b10 100%)",
  },
  {
    key: "ember",
    label: loc("Закат", "Quyosh botishi"),
    light:
      "radial-gradient(1150px 700px at 88% -12%, #f5cdb3 0%, transparent 60%), radial-gradient(900px 560px at 6% 30%, #edd0d0 0%, transparent 56%), linear-gradient(180deg, #faeee5 0%, #eef0f4 100%)",
    dark:
      "radial-gradient(1150px 700px at 88% -12%, #3a2017 0%, transparent 62%), radial-gradient(900px 560px at 6% 30%, #2c1a1c 0%, transparent 58%), linear-gradient(180deg, #110d0d 0%, #0a0b10 100%)",
  },
];

export const DEFAULT_BACKDROP: Backdrop = "none";

export function isBackdrop(value: string | undefined | null): value is Backdrop {
  return BACKDROPS.some((b) => b.key === value);
}

export const backdropSpec = (key: Backdrop): BackdropSpec =>
  BACKDROPS.find((b) => b.key === key) ?? BACKDROPS[0];

/** Слои для текущей темы. Пусто — фон выключен, холст обычный. */
export const backdropValue = (key: Backdrop, theme: "light" | "dark"): string =>
  theme === "dark" ? backdropSpec(key).dark : backdropSpec(key).light;
