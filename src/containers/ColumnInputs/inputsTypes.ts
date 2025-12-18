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
  durability: {
    icon: "ShieldIcon",
    type: "number",
    image: true,
  },
  weight: {
    icon: "WeightIcon",
    type: "number",
    image: true,
  },
  tonnage: {
    icon: "LoadCapacityIcon",
    type: "number",
    image: true,
  },
  parts: {
    icon: "PuzzleIcon",
    type: "number",
    image: true,
  },
  maxParts: {
    icon: "PuzzleIcon",
    type: "number",
    image: true,
  },
};

const secondColumnInputs: InputsData = {
  powerScores: {
    icon: "FlashOutlineIcon",
    type: "number",
    image: true,
  },
  maxPowerScores: {
    icon: "FlashFillIcon",
    type: "number",
    image: false,
  },
  minPartHp: {
    icon: "MinLoadIcon",
    type: "number",
    image: false,
  },
  maxPartHp: {
    icon: "MaxLoadIcon",
    type: "number",
    image: false,
  },
  coDriver: {
    icon: "DriverIcon",
    type: "checkbox",
    image: true,
  },
};

export const allColumns = [firstColumnInputs, secondColumnInputs];
