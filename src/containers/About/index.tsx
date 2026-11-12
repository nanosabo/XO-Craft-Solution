import { useRef } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import PageTitle from "@src/components/PageTitle";
import { logWarning } from "@src/helpers/errorLog";
import useAppVersion from "@src/containers/Settings/useAppVersion";
import useScrollFade from "@src/hooks/useScrollFade";
import {
  BellIcon,
  CartIcon,
  CraftIcon,
  ExternalIcon,
  GuideIcon,
  HistoryIcon,
  LogsIcon,
  InventoryIcon,
  RefreshIcon,
  SlidersIcon,
} from "@src/ui/icons";
import GradientPuzzleIcon from "@src/ui/icons/SolvedIcons/GradientPuzzleIcon";
import styles from "./styles/About.module.scss";

const links = [
  {
    key: "github",
    url: "https://github.com/nanosabo/XO-Craft-Solution",
  },
  {
    key: "discord",
    url: "https://discord.gg/cwtHShAfZx",
  },
  {
    key: "site",
    url: "https://nanosabo.github.io/xocs-imgs/",
  },
];

const features = [
  {
    key: "craft",
    icon: <CraftIcon />,
  },
  {
    key: "inventory",
    icon: <InventoryIcon />,
  },
  {
    key: "analog",
    icon: <SlidersIcon />,
  },
  {
    key: "market",
    icon: <CartIcon />,
  },
  {
    key: "notifications",
    icon: <BellIcon />,
  },
  {
    key: "stats",
    icon: <LogsIcon />,
  },
  {
    key: "guides",
    icon: <GuideIcon />,
  },
  {
    key: "history",
    icon: <HistoryIcon />,
  },
  {
    key: "updates",
    icon: <RefreshIcon />,
  },
];

const notes = ["local", "market", "free"];

const authorSupport = [
  {
    key: "gaijin",
    url: "https://store.gaijin.net/catalog.php?category=Crossout&partner=SABOTAGE&partner_val=rwdcmjgd",
  },
  {
    key: "mono",
    url: "https://send.monobank.ua/jar/4CErJGG8WM",
  },
] as const;

const serviceSupport = [
  {
    key: "core",
    url: "https://crossoutcore.ru/boost/",
  },
  {
    key: "info",
    url: "https://crossout-info.com/subscribe",
  },
] as const;

const About = () => {
  const { t } = useTranslation("aboutPage");
  const version = useAppVersion();
  const contentRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(contentRef);

  const openExternal = (url: string) => {
    void window.electronAPI
      .openExternal(url)
      .catch((error) => logWarning("open-external", error));
  };

  return (
    <div className={styles.layout}>
      <div
        ref={contentRef}
        className={classNames(styles.content, {
          [styles.fadeTop]: fade.top,
          [styles.fadeBottom]: fade.bottom,
        })}
      >
        <div className={styles.inner}>
          <PageTitle title={t("title")} subtitle={t("subtitle")} />

          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <span className={styles.badge}>
                {t("hero.badge", { version })}
              </span>
              <h2>{t("hero.title")}</h2>
              <p className={styles.heroText}>{t("hero.description")}</p>

              <div className={styles.heroMeta}>
                <span>{t("hero.author")}</span>
                <span>{t("hero.platforms")}</span>
                <span>{t("hero.languages")}</span>
              </div>
            </div>

            <div className={styles.heroArt} aria-hidden="true">
              <GradientPuzzleIcon />
            </div>
          </section>

          <section className={styles.support}>
            <header className={styles.supportHead}>
              <span className={styles.kicker}>{t("support.kicker")}</span>
              <h2>{t("support.title")}</h2>
              <p>{t("support.text")}</p>
            </header>

            <div className={styles.ways}>
              {authorSupport.map(({ key, url }) => (
                <button
                  key={key}
                  type="button"
                  className={classNames(styles.way, {
                    [styles.wayFeatured]: key === "gaijin",
                  })}
                  onClick={() => openExternal(url)}
                >
                  <span className={styles.wayTop}>
                    <span className={styles.wayMark}>
                      {key === "gaijin" ? "3%" : t("support.mono.mark")}
                    </span>
                    <span className={styles.wayTitle}>
                      {t(`support.${key}.title`)}
                    </span>
                  </span>
                  <span className={styles.wayText}>
                    {t(`support.${key}.text`)}
                  </span>
                  <span className={styles.wayFoot}>
                    {key === "gaijin" && (
                      <span className={styles.sticker}>
                        {t("support.gaijin.sticker")}
                      </span>
                    )}
                    <span className={styles.wayAction}>
                      {t(`support.${key}.action`)}
                      <ExternalIcon />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.services}>
            <header className={styles.servicesHead}>
              <h2>{t("services.title")}</h2>
              <p>{t("services.text")}</p>
            </header>

            <div className={styles.serviceList}>
              {serviceSupport.map(({ key, url }) => (
                <button
                  key={key}
                  type="button"
                  className={styles.service}
                  onClick={() => openExternal(url)}
                >
                  <span className={styles.serviceName}>
                    <strong>{t(`services.${key}.host`)}</strong>
                    <span>{t(`services.${key}.role`)}</span>
                  </span>
                  <span className={styles.serviceGo}>
                    {t("services.action")}
                    <ExternalIcon />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2>{t("features.title")}</h2>
              <p>{t("features.subtitle")}</p>
            </header>

            <div className={styles.features}>
              {features.map(({ key, icon }) => (
                <article key={key} className={styles.feature}>
                  <span className={styles.featureIcon}>{icon}</span>
                  <div>
                    <h3>{t(`features.${key}.title`)}</h3>
                    <p>{t(`features.${key}.text`)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className={styles.bottomGrid}>
            <section className={styles.card}>
              <h3>{t("links.title")}</h3>
              <p>{t("links.subtitle")}</p>

              <div className={styles.links}>
                {links.map(({ key, url }) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.linkButton}
                    onClick={() => openExternal(url)}
                  >
                    {t(`links.${key}`)}
                    <ExternalIcon />
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <h3>{t("data.title")}</h3>
              <p>{t("data.subtitle")}</p>

              <ul className={styles.notes}>
                {notes.map((key) => (
                  <li key={key}>{t(`data.${key}`)}</li>
                ))}
              </ul>
            </section>
          </div>

          <footer className={styles.footer}>
            <span>{t("footer.version", { version })}</span>
            <span>{t("footer.madeBy")}</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default About;
