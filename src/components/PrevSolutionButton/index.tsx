import { selectLoaderState } from "@src/store/slices/loader.slice";
import { useAppSelector } from "@src/store/store";
import SquareButton from "@src/ui/SquareButton";
import { useNavigate } from "react-router-dom";
import styles from "./styles/PrevSolutionButton.module.scss";
import { TimeIcon } from "@src/ui/icons";
import { useTranslation } from "react-i18next";

const PrevSolutionButton = () => {
  const { solvedResult } = useAppSelector(selectLoaderState);

  const navigate = useNavigate();
  const { t } = useTranslation("navigation");

  if (!solvedResult) return null;

  const isDisabled = window.location.hash === "#/solved";

  const onClick = () => {
    navigate("/solved");
  };

  return (
    <SquareButton
      onClick={onClick}
      className={styles.root}
      disabled={isDisabled}
      title={t("prev")}
    >
      <TimeIcon />
    </SquareButton>
  );
};

export default PrevSolutionButton;
