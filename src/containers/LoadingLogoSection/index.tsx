import CrossoutLogo from "@src/components/CrossoutLogo";
import LoadingTitle from "@src/components/LoadingTitle";
import styles from "./styles/LoadingLogoSection.module.scss";
import { FC } from "react";
import CrossoutLogoError from "@src/components/CrossoutLogo/CrossoutLogoError";
import { useTranslation } from "react-i18next";
import { LoaderStateStatus } from "@src/store/slices/loader.slice";

type Props = {
  isInitialStatus: boolean;
  isErrorStatus: boolean;
  status: LoaderStateStatus;
};

const LoadingLogoSection: FC<Props> = ({
  isInitialStatus,
  isErrorStatus,
  status,
}) => {
  const { t } = useTranslation("loaderPage", { keyPrefix: status });

  const title = t("title");
  const subtitle = t("subtitle");

  return (
    <div className={styles.loading_logo_section}>
      {isErrorStatus ? <CrossoutLogoError /> : <CrossoutLogo />}
      <LoadingTitle title={title} subtitle={subtitle} logo={isInitialStatus} />
    </div>
  );
};

export default LoadingLogoSection;
