import { FC } from "react";
import SearchedDetail from "../SearchedDetail";
import { SearchedPart } from "./RequiredParts";
import styles from "./styles/ColumtInputs.module.scss";
import { motion } from "framer-motion";
import { useAppDispatch } from "@src/store/store";
import { addPart } from "@src/store/slices/requiredParts.slice";

type Props = {
  parts: SearchedPart[];
  onClose: () => void;
};

const SearchedParts: FC<Props> = ({ parts, onClose }) => {
  const dispathch = useAppDispatch();

  const onClickAdd = (data: { id: string; name: string; eng_name: string, maxCount: number }) => {
    dispathch(addPart(data));
    onClose();
  };

  return (
    <motion.div
      className={styles.searched}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {parts.map((item) => (
        <SearchedDetail
          key={item.id}
          name={item.name}
          eng_name={item.eng_name}
          id={item.id}
          withControls={false}
          onClickAdd={onClickAdd.bind(this, item)}
        />
      ))}
    </motion.div>
  );
};

export default SearchedParts;
