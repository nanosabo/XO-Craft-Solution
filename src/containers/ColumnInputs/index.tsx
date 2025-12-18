import InputSection from "@src/components/InputSection";
import { useTranslation } from "react-i18next";
import styles from "./styles/ColumtInputs.module.scss";
import { allColumns } from "./inputsTypes";
import { ChangeEvent } from "react";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectSolveInputsState,
  setSolveInput,
  solveInputsState,
} from "@src/store/slices/solveInputs.slice";
import RequiredParts from "./RequiredParts";

const ColumnInputs = () => {
  const { t, i18n } = useTranslation("mainPage", { keyPrefix: "inputs" });

  const data = useAppSelector(selectSolveInputsState);
  const dispatch = useAppDispatch();

  const onChange = (
    name: keyof solveInputsState,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    dispatch(
      setSolveInput({
        key: name,
        value:
          e.target.type === "checkbox"
            ? e.target.checked
            : Number(e.target.value) || 0,
      })
    );
  };

  return (
    <div className={styles.wrapper}>
      {allColumns.map((inputs, key) => (
        <div key={key} className={styles.block}>
          {Object.entries(inputs).map(([name, { icon, type }]) => (
            <InputSection
              key={name}
              icon={icon}
              type={type}
              value={data[name as keyof solveInputsState] as string | number}
              checked={
                typeof data[name as keyof solveInputsState] === "boolean"
                  ? (data[name as keyof solveInputsState] as boolean)
                  : undefined
              }
              min={
                typeof data[name as keyof solveInputsState] === "number"
                  ? 0
                  : undefined
              }
              onChange={(value) =>
                onChange(name as keyof solveInputsState, value)
              }
              title={t(`${name}.title`)}
              placeholder={t("placeholder")}
              tooltipTitle={t(`${name}.tooltip.title`)}
              toolTipSubtitle={t(`${name}.tooltip.subtitle`)}
              tooltipImage={
                inputs[name].image
                  ? `tooltips/${i18n.language}/${name}.png`
                  : undefined
              }
            />
          ))}
        </div>
      ))}

      <RequiredParts />
    </div>
  );
};

export default ColumnInputs;
