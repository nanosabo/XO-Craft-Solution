import { ChevronIcon, UnavaibleIcon } from "@src/ui/icons";
import Badge from "../Badge";
import MarketImageSection from "../MarketImageSection";
import MarketItemImage from "../MarketItem/MarketItemImage";
import styles from "./styles/MarketModalTop.module.scss";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  closeMarketModal,
  MarketModalState,
  setMarketModalShow,
} from "@src/store/slices/marketModal.slice";
import { rarities } from "@src/helpers/rarities";
import useMarketModal from "@src/hooks/useMarketModal";
import classNames from "classnames";
import MarketModalTree from "./MarketModalTree";
import { AnimatePresence } from "framer-motion";
import MarketModalOwnButton from "./MarketModalOwnButton";
import { getItemFollowValues } from "@src/store/follow";
import {
  selectMarketState,
  setFollowedItem,
  switchNoRecipe,
} from "@src/store/slices/market.slice";
import { useTranslation } from "react-i18next";
import MarketFilterButton from "@src/components/MarketFilterButton";
import MarketIcons from "@src/ui/icons/MarketFilterIcons";

const buttons = ["craft", "own", "chart", "follow"];

const MarketModalTop = () => {
  const { item, itemCost, isOwn, show, noRecipeMarked } = useMarketModal();
  const { followedItems } = useAppSelector(selectMarketState);
  const { t } = useTranslation("marketPage");

  const dispatch = useAppDispatch();

  const isFollowed = followedItems.includes(item.id);

  const buyIsBetter = itemCost > item.rawPrices.b;
  const selfProfit = Math.abs(
    Math.round((itemCost - item.rawPrices.b) * 100) / 100,
  );

  const onClose = () => {
    dispatch(closeMarketModal());
  };

  const onClickTab = (id: string) => {
    dispatch(setMarketModalShow(id as MarketModalState["show"]));
  };

  const onClickNoRecipe = () => {
    dispatch(switchNoRecipe(item.id));
  };

  const onClickFollow = () => {
    dispatch(
      setFollowedItem({
        id: item.id,
        values: getItemFollowValues(item),
      }),
    );
    dispatch(setMarketModalShow("follow"));
  };

  const dontHasRecipe =
    show === "own"
      ? !isOwn
      : item.recipe === "$undefined" || item.craftable === 0;

  const tabs = buttons.map((key) => ({
    id: key,
    label: t(`modal.buttons.${key}`),
  }));

  return (
    <>
      <button className={styles.close} onClick={onClose}>
        <ChevronIcon />
      </button>

      <h3 className={styles.name}>{item.name}</h3>

      <MarketImageSection
        rare={rarities[item.rarityId]}
        className={styles.craft_tree}
      >
        <MarketItemImage id={item.id} title={item.name} />

        <div className={styles.craft_decision}>
          {!dontHasRecipe && (
            <>
              <Badge
                title={t("modal.titles.craft_or_buy")}
                text={t("modal.names.craft_or_buy")}
                warning={buyIsBetter}
                className={styles.badge}
              >
                {buyIsBetter ? t("modal.names.buy") : t("modal.names.craft")}
              </Badge>

              <Badge
                text={`${t("modal.names.saving")}:`}
                className={styles.badge}
              >
                {selfProfit} <img src="./coin.png" draggable={false} />
              </Badge>
            </>
          )}

          <Badge
            title={t("titles.roi")}
            text="ROI:"
            className={styles.badge}
            grey
          >
            {item.roi}%
          </Badge>
        </div>

        <div
          className={classNames(styles.tabs, styles[rarities[item.rarityId]])}
        >
          {tabs.map((btn) => (
            <button
              key={btn.id}
              className={classNames(styles.tab_button, {
                [styles.active]: btn.id === show,
              })}
              onClick={() => onClickTab(btn.id)}
              disabled={btn.id === show}
            >
              {btn.label}
            </button>
          ))}

          <AnimatePresence>
            {show === "own" && <MarketModalOwnButton />}
          </AnimatePresence>
        </div>

        <button
          className={classNames(
            styles.trigger_btn,
            styles[rarities[item.rarityId]],
            {
              [styles.active]: noRecipeMarked,
            },
          )}
          title={t("modal.titles.mark_no_recipe")}
          onClick={onClickNoRecipe}
        >
          <UnavaibleIcon />
        </button>

        <MarketFilterButton
          className={styles.follow_btn}
          title={
            isFollowed ? t("modal.follow.remove") : t("modal.follow.add")
          }
          onClick={onClickFollow}
          isActive={isFollowed}
        >
          <MarketIcons.BellIcon />
        </MarketFilterButton>

        <MarketModalTree />
      </MarketImageSection>
    </>
  );
};

export default MarketModalTop;
