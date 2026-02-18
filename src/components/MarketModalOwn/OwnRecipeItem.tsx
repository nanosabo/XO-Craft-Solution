import { ChangeEvent, FC } from "react";
import RecipeItem, { RecipeItemProps } from "../MarketModalBottom/RecipeItem";
import styles from "./styles/MarketModalOwn.module.scss";
import RecipeInput from "@src/ui/RecipeInput";
import { TrashIcon } from "@src/ui/icons";
import { useAppDispatch } from "@src/store/store";
import {
  removeOwnRecipeIng,
  updateAmountOwnRecipeIng,
} from "@src/store/slices/marketModal.slice";

export interface Props extends RecipeItemProps {
  amount: number;
}

const OwnRecipeItem: FC<Props> = (props) => {
  const { amount, ...rest } = props;
  const dispatch = useAppDispatch();

  const onRemove = () => {
    dispatch(removeOwnRecipeIng(props.id));
  };

  const onChangeAmount = (e: ChangeEvent<HTMLInputElement>) => {
    const value = +e.target.value;
    dispatch(
      updateAmountOwnRecipeIng({ id: props.id, amount: value < 1 ? 1 : value }),
    );
  };

  return (
    <RecipeItem {...rest}>
      <button className={styles.remove_item_btn} onClick={onRemove}>
        <TrashIcon />
      </button>
      <RecipeInput
        value={amount}
        className={styles.input}
        type="number"
        min={1}
        onChange={onChangeAmount}
      />
    </RecipeItem>
  );
};

export default OwnRecipeItem;
