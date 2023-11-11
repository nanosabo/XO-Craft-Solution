import { InputSectionProps } from "@src/components/InputSection";

interface Input {
  icon: InputSectionProps["icon"];
  type: InputSectionProps["type"];
}

interface InputsData {
  [key: string]: Input;
}

const firstColumnInputs: InputsData = {
  strenght: {
    icon: "ShieldIcon",
    type: "number",
  },
  weight: {
    icon: "WeightIcon",
    type: "number",
  },
  capacity: {
    icon: "LoadCapacityIcon",
    type: "number",
  },
  details: {
    icon: "PuzzleIcon",
    type: "number",
  },
  maxDetails: {
    icon: "PuzzleIcon",
    type: "number",
  },
};

const secondColumnInputs: InputsData = {
  powerpoints: {
    icon: "FlashOutlineIcon",
    type: "number",
  },
  maxPowerpoints: {
    icon: "FlashFillIcon",
    type: "number",
  },
  minDetailHp: {
    icon: "MinLoadIcon",
    type: "number",
  },
  maxDetailHp: {
    icon: "MaxLoadIcon",
    type: "number",
  },
  driver: {
    icon: "DriverIcon",
    type: "checkbox",
  },
};

export const allColumns = [firstColumnInputs, secondColumnInputs];
