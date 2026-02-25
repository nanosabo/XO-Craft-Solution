import { useTranslation } from "react-i18next";
import styles from "./styles/MarketItems.module.scss";
import { ArrowIcon } from "@src/ui/icons";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  MarketState,
  selectMarketState,
  setMarketSort,
} from "@src/store/slices/market.slice";
import classNames from "classnames";
const headers: { name: MarketState["sort_by"]; title?: string }[] = [
  {
    name: "sell_price",
  },
  {
    name: "buy_price",
  },
  {
    name: "sell_offers",
  },
  {
    name: "buy_offers",
  },
  {
    name: "spread",
    title: "spread",
  },
  {
    name: "roi",
    title: "roi",
  },
  {
    name: "crafting",
    title: "crafting",
  },
  {
    name: "profit",
    title: "craft",
  },
];

const TableHeader = () => {
  const { sort_by, sort_order } = useAppSelector(selectMarketState);
  const dispatch = useAppDispatch();
  const { t } = useTranslation("marketPage");

  const onClick = (sort: MarketState["sort_by"]) => {
    dispatch(setMarketSort(sort));
  };

  return (
    <div className={styles.market__header}>
      <div>{t("names.name")}</div>
      {headers.map((header) => (
        <button
          className={classNames(
            styles.market__header__button,
            styles[sort_order],
          )}
          key={header.name}
          onClick={onClick.bind(this, header.name)}
          title={header.title ? t(`titles.${header.title}`) : undefined}
        >
          <span>
            {t(`names.${header.name}`)}{" "}
            {sort_by === header.name && <ArrowIcon />}
          </span>
        </button>
      ))}
    </div>
  );
};

export default TableHeader;
