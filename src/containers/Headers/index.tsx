import PageTitle from "@src/components/PageTitle";
import BigButton from "@src/ui/BigButton";
import { useTranslation } from "react-i18next";
import styles from "./styles/MainPageHeader.module.scss";
import { useAppDispatch } from "@src/store/store";
import { useNavigate } from "react-router-dom";
import { setLoaderSolvingStatus } from "@src/store/slices/loader.slice";
import { useFormContext } from "react-hook-form";
import { VehicleFormData } from "@src/helpers/validation";
import { setSolveValues } from "@src/store/slices/solveInputs.slice";

const MainPageHeader = () => {
  const { t } = useTranslation("mainPage");

  const navigate = useNavigate();

  const dispatch = useAppDispatch();

  const { handleSubmit } = useFormContext<VehicleFormData>();

  const onClickSolve = handleSubmit((data) => {
    dispatch(setSolveValues(data));
    dispatch(setLoaderSolvingStatus());
    navigate("/loading");
  });

  return (
    <div className={styles.header}>
      <PageTitle title={t("header.title")} subtitle={t("header.subtitle")} />
      <BigButton onClick={onClickSolve}>{t("solve.title")}</BigButton>
    </div>
  );
};

export default MainPageHeader;
