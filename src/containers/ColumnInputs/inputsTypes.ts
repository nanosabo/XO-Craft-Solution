import { InputSectionProps } from "@src/components/InputSection";

interface Input {
  icon: InputSectionProps["icon"];
  type: InputSectionProps["type"];
  image: boolean;
}

interface InputsData {
  [key: string]: Input;
}

const firstColumnInputs: InputsData = {
  strenght: {
    icon: "ShieldIcon",
    type: "number",
    image: true,
  },
  weight: {
    icon: "WeightIcon",
    type: "number",
    image: true,
  },
  capacity: {
    icon: "LoadCapacityIcon",
    type: "number",
    image: true,
  },
  details: {
    icon: "PuzzleIcon",
    type: "number",
    image: true,
  },
  maxDetails: {
    icon: "PuzzleIcon",
    type: "number",
    image: true,
  },
};

const secondColumnInputs: InputsData = {
  powerpoints: {
    icon: "FlashOutlineIcon",
    type: "number",
    image: true,
  },
  maxPowerpoints: {
    icon: "FlashFillIcon",
    type: "number",
    image: false,
  },
  minDetailHp: {
    icon: "MinLoadIcon",
    type: "number",
    image: false,
  },
  maxDetailHp: {
    icon: "MaxLoadIcon",
    type: "number",
    image: false,
  },
  driver: {
    icon: "DriverIcon",
    type: "checkbox",
    image: true,
  },
};

export const allColumns = [firstColumnInputs, secondColumnInputs];
