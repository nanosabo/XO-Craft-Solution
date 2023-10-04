import WindowActions from "@src/containers/WindowActions";
import { FC, PropsWithChildren } from "react";

const PageLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <>
      <header>
        <WindowActions />
      </header>
      <main>{children}</main>
    </>
  );
};

export default PageLayout;
