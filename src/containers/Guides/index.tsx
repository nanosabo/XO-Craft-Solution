import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import PageTitle from "@src/components/PageTitle";
import { contentLanguage } from "@src/helpers/contentLanguage";
import useScrollFade from "@src/hooks/useScrollFade";
import { CraftIcon, LogsIcon, MarketIcon } from "@src/ui/icons";
import craftFormRu from "@src/assets/guides/ru/craft-form.jpg";
import marketListRu from "@src/assets/guides/ru/market-list.jpg";
import styles from "./styles/Guides.module.scss";

const guides = [
  {
    key: "craft",
    icon: <CraftIcon />,
    screens: [{ key: "form" }, { key: "result" }],
  },
  {
    key: "market",
    icon: <MarketIcon />,
    screens: [{ key: "list" }, { key: "item" }, { key: "recipe" }],
  },
  {
    key: "stats",
    icon: <LogsIcon />,
    screens: [{ key: "open" }, { key: "log" }],
  },
] as const;

type GuideKey = (typeof guides)[number]["key"];
type ScreenKey = (typeof guides)[number]["screens"][number]["key"];

const shots: Partial<
  Record<`${GuideKey}.${ScreenKey}`, Partial<Record<"ru" | "en", string>>>
> = {
  "craft.form": { ru: craftFormRu },
  "market.list": { ru: marketListRu },
};

interface GuideSection {
  title: string;
  paragraphs: string[];
  steps: string[];
}

const textList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const sectionsOf = (value: unknown): GuideSection[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const section = item as Record<string, unknown>;
    if (typeof section.title !== "string") return [];

    return [
      {
        title: section.title,
        paragraphs: textList(section.paragraphs),
        steps: textList(section.steps),
      },
    ];
  });
};

const Guides = () => {
  const { t, i18n } = useTranslation("guidesPage");
  const [guide, setGuide] = useState<GuideKey>("craft");
  const [screen, setScreen] = useState<ScreenKey>("form");
  const contentRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(contentRef);
  const current = guides.find((item) => item.key === guide) ?? guides[0];
  const currentScreen =
    current.screens.find((item) => item.key === screen) ?? current.screens[0];
  const sections = sectionsOf(
    t(`${guide}.screens.${currentScreen.key}.sections`, {
      returnObjects: true,
    }),
  );
  const lang = contentLanguage(i18n.language);
  const shot =
    shots[`${guide}.${currentScreen.key}` as `${GuideKey}.${ScreenKey}`]?.[
      lang
    ];

  const openScreen = (nextGuide: GuideKey, nextScreen: ScreenKey) => {
    setGuide(nextGuide);
    setScreen(nextScreen);
  };

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [guide, screen]);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTabs}>
          {guides.map((item) => {
            const groupActive = item.key === guide;

            return (
              <div key={item.key} className={styles.group}>
                <button
                  type="button"
                  className={classNames(styles.sidebarItem, {
                    [styles.sidebarItemActive]: groupActive,
                  })}
                  onClick={() => openScreen(item.key, item.screens[0].key)}
                >
                  <span className={styles.sidebarIcon}>{item.icon}</span>
                  <span className={styles.sidebarLabel}>
                    {t(`${item.key}.title`)}
                  </span>
                </button>

                {groupActive && (
                  <div className={styles.screens} role="tablist">
                    {item.screens.map((itemScreen, index) => (
                      <button
                        key={itemScreen.key}
                        type="button"
                        role="tab"
                        aria-selected={itemScreen.key === currentScreen.key}
                        className={classNames(styles.screen, {
                          [styles.screenActive]:
                            itemScreen.key === currentScreen.key,
                        })}
                        onClick={() => openScreen(item.key, itemScreen.key)}
                      >
                        <span className={styles.screenIndex}>{index + 1}</span>
                        <span className={styles.screenLabel}>
                          {t(`${item.key}.screens.${itemScreen.key}.title`)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <div
        ref={contentRef}
        className={classNames(styles.content, {
          [styles.fadeTop]: fade.top,
          [styles.fadeBottom]: fade.bottom,
        })}
      >
        <div className={styles.inner}>
          <PageTitle title={t("title")} subtitle={t("subtitle")} />

          <article>
            <header className={styles.articleHead}>
              <h2>{t(`${guide}.screens.${currentScreen.key}.title`)}</h2>
              <p>{t(`${guide}.screens.${currentScreen.key}.lead`)}</p>
            </header>

            {shot && (
              <figure className={styles.shot}>
                <img
                  src={shot}
                  alt={t(`${guide}.screens.${currentScreen.key}.caption`)}
                />
                <figcaption>
                  {t(`${guide}.screens.${currentScreen.key}.caption`)}
                </figcaption>
              </figure>
            )}

            {sections.map((section) => (
              <section key={section.title} className={styles.section}>
                <h3>{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.steps.length > 0 && (
                  <ol className={styles.steps}>
                    {section.steps.map((step) => (
                      <li key={step}>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
};

export default Guides;
