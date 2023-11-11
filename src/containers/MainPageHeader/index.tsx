import PageTitle from "@src/components/PageTitle";
import BigButton from "@src/ui/BigButton";
import { useTranslation } from "react-i18next";
import styles from "./styles/MainPageHeader.module.scss";

const MainPageHeader = () => {
  const { t } = useTranslation("mainPage");

  return (
    <div className={styles.header}>
      <PageTitle title={t("header.title")} subtitle={t("header.subtitle")} />
      <BigButton>{t("solve.title")}</BigButton>
    </div>
  );
};

export default MainPageHeader;
