import CrossoutLogo from "@src/components/CrossoutLogo";
import LoadingTitle from "@src/components/LoadingTitle";
import styles from "./styles/LoadingLogoSection.module.scss";

const LoadingLogoSection = () => {
  return (
    <div className={styles.loading_logo_section}>
      <CrossoutLogo />
      <LoadingTitle
        title="Craft Solution"
        subtitle="Загружаемся... Ожидайте"
        logo
      />
    </div>
  );
};

export default LoadingLogoSection;
