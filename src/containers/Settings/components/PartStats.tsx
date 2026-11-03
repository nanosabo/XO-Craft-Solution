import { FC } from "react";
import { useTranslation } from "react-i18next";
import { getPartDurability, Part } from "../types";

interface Props {
  part: Part;
}

const PartStats: FC<Props> = ({ part }) => {
  const { t } = useTranslation("settingsPage");

  return (
    <span>
      {t("inventory.stats", {
        category: part.category,
        power: part.power,
        weight: part.weight,
        durability: getPartDurability(part),
      })}
    </span>
  );
};

export default PartStats;
