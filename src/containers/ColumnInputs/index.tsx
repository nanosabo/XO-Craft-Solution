import InputSection from "@src/components/InputSection";
import { useTranslation } from "react-i18next";
import styles from "./styles/ColumtInputs.module.scss";
import { allColumns } from "./inputsTypes";
import { useEffect } from "react";
import { useAppSelector } from "@src/store/store";
import {
  selectSolveInputsState,
  solveInputsState,
} from "@src/store/slices/solveInputs.slice";
import RequiredParts from "./RequiredParts";
import { useFormContext } from "react-hook-form";
import { VehicleFormData } from "@src/helpers/validation";

const ColumnInputs = () => {
  const { t, i18n } = useTranslation("mainPage");

  const data = useAppSelector(selectSolveInputsState);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useFormContext<VehicleFormData>();

  useEffect(() => {
    Object.keys(data).forEach((key) => {
      setValue(
        key as keyof VehicleFormData,
        data[key as keyof VehicleFormData],
      );
    });
  }, [data, setValue]);

  return (
    <form className={styles.wrapper} onSubmit={handleSubmit(() => {})}>
      {allColumns.map((inputs, key) => (
        <div key={key} className={styles.block}>
          {Object.entries(inputs).map(([name, { icon, type }]) => (
            <InputSection
              key={name}
              register={register(name as keyof VehicleFormData)}
              icon={icon}
              type={type}
              min={
                typeof data[name as keyof solveInputsState] === "number"
                  ? 0
                  : undefined
              }
              title={t(`inputs.${name}.title`)}
              placeholder={t("inputs.placeholder")}
              tooltipTitle={t(`inputs.${name}.tooltip.title`)}
              toolTipSubtitle={t(`inputs.${name}.tooltip.subtitle`)}
              tooltipImage={
                inputs[name].image
                  ? `tooltips/${i18n.language}/${name}.png`
                  : undefined
              }
              error={
                errors[name as keyof solveInputsState]
                  ? t(
                      `errors.${errors[name as keyof solveInputsState]?.message}`,
                    )
                  : undefined
              }
            />
          ))}
        </div>
      ))}

      <RequiredParts />
    </form>
  );
};

export default ColumnInputs;
